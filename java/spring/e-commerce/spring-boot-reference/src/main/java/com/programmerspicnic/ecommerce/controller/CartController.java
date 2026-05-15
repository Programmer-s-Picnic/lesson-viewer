package com.programmerspicnic.ecommerce.controller;

import com.programmerspicnic.ecommerce.service.CartService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class CartController {
  private final CartService cartService;

  public CartController(CartService cartService) {
    this.cartService = cartService;
  }

  @PostMapping("/cart/add")
  public String addToCart(@RequestParam Long productId, @RequestParam(defaultValue = "1") int quantity) {
    cartService.addToCart(productId, quantity);
    return "redirect:/cart";
  }

  @GetMapping("/cart")
  public String viewCart(Model model) {
    model.addAttribute("items", cartService.findAll());
    return "cart/view";
  }
}
