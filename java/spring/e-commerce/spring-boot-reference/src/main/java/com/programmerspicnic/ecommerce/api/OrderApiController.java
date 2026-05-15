package com.programmerspicnic.ecommerce.api;

import com.programmerspicnic.ecommerce.entity.Order;
import com.programmerspicnic.ecommerce.service.OrderService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderApiController {
  private final OrderService orderService;

  public OrderApiController(OrderService orderService) {
    this.orderService = orderService;
  }

  @PostMapping("/checkout")
  public Map<String, Object> checkout(@RequestBody Map<String, String> body) {
    Order order = orderService.checkout(
        body.get("customerName"),
        body.get("address"),
        body.getOrDefault("paymentMode", "COD")
    );
    return Map.of("success", true, "orderId", order.getId(), "message", "Order placed successfully");
  }
}
