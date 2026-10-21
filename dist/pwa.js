(function(){let promptEvent=null;window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
window.StoreInstall=async()=>{if(promptEvent){await promptEvent.prompt();const result=await promptEvent.userChoice;promptEvent=null;return result.outcome==='accepted'?'Install request accepted.':'Installation dismissed.';}return 'Use your browser menu → Install app / Add to Home Screen when supported. This installs the preview, not a live commerce service.';};
})();
