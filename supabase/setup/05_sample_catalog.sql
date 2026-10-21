-- Optional zero-stock starting catalog. Run once before taking any orders.
-- Does nothing if products already exist; never overwrites real inventory.
update public.rm_store set state=$catalog${
  "products": [
    {
      "id": 1,
      "name": "Homestyle mango pickle",
      "cat": "Pickles",
      "unit": "250 g · Traditional recipe",
      "price": 59.6,
      "stock": 0,
      "emoji": "🫙",
      "offer": "Local favourite",
      "hasSizes": false,
      "variants": [
        {
          "id": "weight-100g",
          "label": "100 g",
          "price": 59.6,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-250g",
          "label": "250 g",
          "price": 149,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-500g",
          "label": "500 g",
          "price": 298,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-1kg",
          "label": "1 kg",
          "price": 596,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 2,
      "name": "Premium sona masoori",
      "cat": "Groceries",
      "unit": "5 kg · Everyday essentials",
      "price": 329,
      "stock": 0,
      "emoji": "🌾",
      "offer": "Everyday value",
      "hasSizes": false,
      "variants": [
        {
          "id": "standard",
          "label": "5 kg",
          "price": 329,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 3,
      "name": "Everyday storage set",
      "cat": "Home & plastic",
      "unit": "Set of 3 · With lids",
      "price": 199,
      "stock": 0,
      "emoji": "🥣",
      "offer": "Popular pick",
      "hasSizes": false,
      "variants": [
        {
          "id": "standard",
          "label": "Set of 3",
          "price": 199,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 4,
      "name": "Cotton everyday tee",
      "cat": "Clothing",
      "unit": "Olive · Sizes M / L / XL",
      "price": 399,
      "stock": 0,
      "emoji": "👕",
      "offer": "New arrival",
      "hasSizes": true,
      "variants": [
        {
          "id": "size-m",
          "label": "M",
          "price": 399,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "size-l",
          "label": "L",
          "price": 399,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "size-xl",
          "label": "XL",
          "price": 399,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 5,
      "name": "Groundnut oil",
      "cat": "Groceries",
      "unit": "1 litre · Cooking essential",
      "price": 189,
      "stock": 0,
      "emoji": "🍶",
      "offer": "Restocking soon",
      "hasSizes": false,
      "variants": [
        {
          "id": "standard",
          "label": "1 litre",
          "price": 189,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 6,
      "name": "Lemon pickle",
      "cat": "Pickles",
      "unit": "250 g · Tangy & traditional",
      "price": 51.6,
      "stock": 0,
      "emoji": "🍋",
      "offer": "Kitchen favourite",
      "hasSizes": false,
      "variants": [
        {
          "id": "weight-100g",
          "label": "100 g",
          "price": 51.6,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-250g",
          "label": "250 g",
          "price": 129,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-500g",
          "label": "500 g",
          "price": 258,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "weight-1kg",
          "label": "1 kg",
          "price": 516,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 7,
      "name": "Multipurpose basket",
      "cat": "Home & plastic",
      "unit": "Medium · Household storage",
      "price": 119,
      "stock": 0,
      "emoji": "🧺",
      "offer": "Organise your home",
      "hasSizes": false,
      "variants": [
        {
          "id": "standard",
          "label": "Medium",
          "price": 119,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 8,
      "name": "Cotton kurta",
      "cat": "Clothing",
      "unit": "Blue · Sizes M / L / XL",
      "price": 649,
      "stock": 0,
      "emoji": "👗",
      "offer": "Comfort, every day",
      "hasSizes": true,
      "variants": [
        {
          "id": "size-m",
          "label": "M",
          "price": 649,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "size-l",
          "label": "L",
          "price": 649,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "size-xl",
          "label": "XL",
          "price": 649,
          "stock": 0,
          "enabled": true
        }
      ],
      "kind": "physical"
    },
    {
      "id": 9,
      "name": "Fresh vegetables · sample",
      "cat": "Vegetables",
      "emoji": "🥬",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 25,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "250 g",
          "price": 25,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "500 g",
          "price": 45,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-2",
          "label": "1 kg",
          "price": 85,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 10,
      "name": "Everyday shoes · sample",
      "cat": "Footwear",
      "emoji": "👟",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 599,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "UK 6",
          "price": 599,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "UK 7",
          "price": 599,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-2",
          "label": "UK 8",
          "price": 599,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-3",
          "label": "UK 9",
          "price": 599,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 11,
      "name": "Everyday belt · sample",
      "cat": "Belts & Wallets",
      "emoji": "👝",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 199,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Small",
          "price": 199,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "Medium",
          "price": 199,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-2",
          "label": "Large",
          "price": 219,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 12,
      "name": "Daily-use handbag · sample",
      "cat": "Handbags & Purses",
      "emoji": "👜",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 399,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Standard",
          "price": 399,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 13,
      "name": "Bangle set · sample",
      "cat": "Bangles & Jewellery",
      "emoji": "💍",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 149,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Size 2.4",
          "price": 149,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "Size 2.6",
          "price": 149,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-2",
          "label": "Size 2.8",
          "price": 149,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 14,
      "name": "Bindi collection · sample",
      "cat": "Bindis & Ticklies",
      "emoji": "🌸",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 25,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "One card",
          "price": 25,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "Pack of 5",
          "price": 99,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 15,
      "name": "Personal-care item · sample",
      "cat": "Beauty & Personal Care",
      "emoji": "🧴",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 99,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "100 ml",
          "price": 99,
          "stock": 0,
          "enabled": true
        },
        {
          "id": "option-1",
          "label": "200 ml",
          "price": 179,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 16,
      "name": "Snacks — replace sample",
      "cat": "Snacks",
      "emoji": "🥨",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 100,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Standard",
          "price": 100,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 17,
      "name": "Meal — replace sample",
      "cat": "Food",
      "emoji": "🍛",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 100,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Standard",
          "price": 100,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 18,
      "name": "Home meal — replace sample",
      "cat": "Homemade Food",
      "emoji": "🍲",
      "kind": "physical",
      "unit": "Replace sample details",
      "offer": "",
      "price": 100,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "Standard",
          "price": 100,
          "stock": 0,
          "enabled": true
        }
      ]
    },
    {
      "id": 19,
      "name": "Your ebook — upload file before selling",
      "cat": "Ebooks",
      "emoji": "📚",
      "kind": "ebook",
      "unit": "Replace sample details",
      "offer": "",
      "price": 100,
      "stock": 0,
      "variants": [
        {
          "id": "option-0",
          "label": "PDF",
          "price": 100,
          "stock": 0,
          "enabled": true
        }
      ]
    }
  ],
  "categories": [
    {
      "name": "Pickles",
      "enabled": true
    },
    {
      "name": "Groceries",
      "enabled": true
    },
    {
      "name": "Home & plastic",
      "enabled": true
    },
    {
      "name": "Clothing",
      "enabled": true
    },
    {
      "name": "Vegetables",
      "enabled": true
    },
    {
      "name": "Footwear",
      "enabled": true
    },
    {
      "name": "Belts & Wallets",
      "enabled": true
    },
    {
      "name": "Handbags & Purses",
      "enabled": true
    },
    {
      "name": "Bangles & Jewellery",
      "enabled": true
    },
    {
      "name": "Bindis & Ticklies",
      "enabled": true
    },
    {
      "name": "Beauty & Personal Care",
      "enabled": true
    },
    {
      "name": "Snacks",
      "enabled": true
    },
    {
      "name": "Food",
      "enabled": true
    },
    {
      "name": "Homemade Food",
      "enabled": true
    },
    {
      "name": "Ebooks",
      "enabled": true
    }
  ],
  "storeMode": "closed",
  "message": "Store setup in progress. Please visit again soon.",
  "branding": {
    "name": "Racharla Mart",
    "tagline": "Your neighbourhood, delivered",
    "description": "Local essentials and digital reads.",
    "address": "",
    "phone": "",
    "email": "",
    "about": ""
  },
  "banner": "A little local. A lot to love.",
  "billOffer": {
    "enabled": false,
    "name": "Launch offer",
    "percent": 5,
    "minimumPaise": 0,
    "capPaise": 0,
    "stack": false,
    "start": "",
    "end": ""
  },
  "policy": {
    "version": "v1",
    "freeMinutes": 10,
    "demoFeesEnabled": false,
    "afterDispatchFee": 0,
    "maxFee": 0
  },
  "storePin": null,
  "radius": 5,
  "freeKm": 1,
  "rate": 10,
  "free": true,
  "deliveryEnabled": false,
  "allowedPincodes": [],
  "serviceNotice": {
    "enabled": false
  },
  "slides": [],
  "videos": [],
  "policies": {
    "privacy": "",
    "terms": "",
    "returns": ""
  }
}$catalog$::jsonb,version=version+1
where id=true and jsonb_array_length(state->'products')=0 and not exists(select 1 from public.rm_orders);
