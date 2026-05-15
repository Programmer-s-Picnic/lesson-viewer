
(function(){
  "use strict";
  window.ppApiExamples = {
    listProducts: () => fetch("/api/products").then(r => r.json()),
    addToCart: (productId=1, quantity=1) => fetch("/api/cart/add", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({productId, quantity})
    }).then(r => r.json()),
    checkout: () => fetch("/api/orders/checkout", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({customerName:"Test User", address:"Test Address", paymentMode:"COD"})
    }).then(r => r.json())
  };
})();
