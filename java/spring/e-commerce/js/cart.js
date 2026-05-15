
(function(){
  "use strict";
  async function apiAddToCart(productId, quantity){
    const res = await fetch("/api/cart/add",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({productId,quantity})
    });
    return res.json();
  }
  window.ppCartDemo = { apiAddToCart };
})();
