(function (host) {
  'use strict';
  const statuses = ['Preparing', 'Ready for pickup', 'Out for delivery', 'Delivered', 'Failed delivery', 'Cancelled'];
  const transitions = {
    'Preparing': ['Ready for pickup'],
    'Ready for pickup': ['Out for delivery'],
    'Out for delivery': ['Delivered', 'Failed delivery'],
    'Failed delivery': ['Ready for pickup'],
    'Delivered': [], 'Cancelled': []
  };
  function minor(value) { const n=Number(value),p=Math.round(n*100); if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(p))throw Error('Invalid payment amount.');return p; }
  function remaining(order) {
    const paid=minor(order.total),refunded=order.refundedPaise||0,pending=order.pendingRefundPaise||0,fee=order.cancellation?.chargePaise||0;
    if([refunded,pending,fee].some(n=>!Number.isSafeInteger(n)||n<0)||refunded+pending+fee>paid)throw Error('Refund ledger needs admin review.');
    return paid-refunded-pending-fee;
  }
  function quote(order, who, reason, now = Date.now()) {
    if(!['customer','admin'].includes(who))throw Error('Invalid cancellation actor.');
    const allowed=who==='customer'?['Changed my mind','Ordered by mistake']:['Stock unavailable','Technical issue','Store unable to deliver'];
    if(!allowed.includes(reason))throw Error('This reason requires admin review. Request refund review instead.');
    if (['Delivered', 'Cancelled'].includes(order.status)) throw Error('This order cannot be cancelled. Use a return request for a delivered order.');
    if (order.pendingRefundPaise || order.refundedPaise) throw Error('A refund already exists. Review its ledger before cancelling.');
    const policy = order.policy || {};
    if(!Number.isFinite(Date.parse(order.createdAt))||!Number.isFinite(now))throw Error('Order timestamp needs admin review.');
    const elapsed = Math.max(0, now - new Date(order.createdAt).getTime());
    const isStoreFault = who !== 'customer' || ['Stock unavailable', 'Technical issue', 'Store unable to deliver', 'Wrong or damaged goods'].includes(reason);
    const grace = elapsed <= (policy.freeMinutes || 10) * 60000;
    const dispatched = Boolean(order.dispatchedAt);
    let charge = 0;
    // Preview fee simulations only. The production default must remain disabled
    // until the policy and reciprocal business obligations have been reviewed.
    if (!isStoreFault && !grace && policy.demoFeesEnabled && dispatched) {
      charge = Math.min(minor(policy.afterDispatchFee || 0), minor(policy.maxFee || 0), remaining(order));
    }
    return { chargePaise: charge, refundPaise: remaining(order) - charge, who, reason, policyVersion: policy.version || 'v1', grace, isStoreFault };
  }
  function event(order, actor, message, now = new Date().toISOString()) {
    order.history ||= []; order.history.push({ actor, message, at: now });
  }
  function queueEmail(order, subject, now = Date.now(), manual = false) {
    order.notifications ||= [];
    if (manual && now - (order.lastResendAt || 0) < 60000) throw Error('Wait 60 seconds before resending this order email.');
    if (!manual && order.notifications.some(n => n.key === subject + ':' + order.history.length)) return;
    if (manual) order.lastResendAt = now;
    order.notifications.push({ subject, at: new Date(now).toISOString(), state: 'Preview only · not sent', key: subject + ':' + order.history.length });
  }
  function transition(order, status, actor) {
    if (!statuses.includes(status) || !transitions[order.status]?.includes(status)) throw Error('That status change is not allowed. Follow preparation → pickup → delivery.');
    if (status === 'Out for delivery' && order.driver === 'Unassigned') throw Error('Assign a delivery person before dispatch.');
    if (status === 'Failed delivery') throw Error('Report the failure with a reason using the delivery workspace.');
    order.status = status;
    if (status === 'Out for delivery') order.dispatchedAt = new Date().toISOString();
    event(order, actor, 'Status changed to ' + status);
    if (['Out for delivery', 'Delivered'].includes(status)) queueEmail(order, status);
  }
  function cancel(order, quoted, actor) {
    const verified = quote(order, quoted.who, quoted.reason);
    if (verified.chargePaise !== quoted.chargePaise || verified.refundPaise !== quoted.refundPaise) throw Error('The order changed. Review the cancellation again.');
    order.status = 'Cancelled'; order.cancellation = { ...verified, at: new Date().toISOString() };
    order.pendingRefundPaise = verified.refundPaise;
    order.refund = verified.refundPaise ? 'Pending · demo provider confirmation' : 'No refund due';
    event(order, actor, 'Cancelled: ' + verified.reason + '. Fee ₹' + (verified.chargePaise / 100).toFixed(2) + '; refund ₹' + (verified.refundPaise / 100).toFixed(2));
    queueEmail(order, 'Cancellation and refund summary');
    return verified;
  }
  function refund(order, amountPaise, actor, reason) {
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || amountPaise > remaining(order)) throw Error('Refund exceeds the remaining refundable payment.');
    if (order.pendingRefundPaise) throw Error('A refund is already pending. Wait for confirmation.');
    if (order.cancellation) throw Error('Use the cancellation refund ledger. Do not submit a second refund.');
    order.pendingRefundPaise = amountPaise;
    order.refund = 'Pending · demo provider confirmation';
    event(order, actor, 'Refund requested: ₹' + (amountPaise / 100).toFixed(2) + '. ' + reason);
    queueEmail(order, 'Refund processing');
  }
  const api = { quote, cancel, transition, event, queueEmail, remaining, refund, minor };
  host.StoreRules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
