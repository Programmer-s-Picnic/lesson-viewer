package com.programmerspicnic.ecommerce.api;

import com.programmerspicnic.ecommerce.entity.CartItem;
import com.programmerspicnic.ecommerce.service.CartService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartApiController {
  private final CartService cartService;

  public CartApiController(CartService cartService) {
    this.cartService = cartService;
  }

  @GetMapping
  public List<CartItem> cart() {
    return cartService.findAll();
  }

  @PostMapping("/add")
  public Map<String, Object> add(@RequestBody Map<String, Object> body) {
    Long productId = Long.valueOf(body.get("productId").toString());
    int quantity = Integer.parseInt(body.getOrDefault("quantity", 1).toString());
    cartService.addToCart(productId, quantity);
    return Map.of("success", true, "message", "Product added to cart");
  }
}
