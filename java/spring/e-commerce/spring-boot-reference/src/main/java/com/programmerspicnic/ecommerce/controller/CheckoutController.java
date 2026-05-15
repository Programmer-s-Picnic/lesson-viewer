package com.programmerspicnic.ecommerce.controller;

import com.programmerspicnic.ecommerce.entity.Order;
import com.programmerspicnic.ecommerce.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class CheckoutController {
  private final OrderService orderService;

  public CheckoutController(OrderService orderService) {
    this.orderService = orderService;
  }

  @GetMapping("/checkout")
  public String form() {
    return "checkout/form";
  }

  @PostMapping("/checkout")
  public String checkout(@RequestParam String customerName,
                         @RequestParam String address,
                         @RequestParam String paymentMode,
                         Model model) {
    Order order = orderService.checkout(customerName, address, paymentMode);
    model.addAttribute("order", order);
    return "checkout/success";
  }
}
