package com.programmerspicnic.ecommerce.service;

import com.programmerspicnic.ecommerce.entity.CartItem;
import com.programmerspicnic.ecommerce.entity.Order;
import com.programmerspicnic.ecommerce.entity.Product;
import com.programmerspicnic.ecommerce.repository.CartItemRepository;
import com.programmerspicnic.ecommerce.repository.OrderRepository;
import com.programmerspicnic.ecommerce.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {
  private final CartItemRepository cartItemRepository;
  private final ProductRepository productRepository;
  private final OrderRepository orderRepository;

  public OrderService(CartItemRepository cartItemRepository,
                      ProductRepository productRepository,
                      OrderRepository orderRepository) {
    this.cartItemRepository = cartItemRepository;
    this.productRepository = productRepository;
    this.orderRepository = orderRepository;
  }

  @Transactional
  public Order checkout(String customerName, String address, String paymentMode) {
    List<CartItem> items = cartItemRepository.findAll();

    if (items.isEmpty()) {
      throw new IllegalStateException("Cart is empty");
    }

    BigDecimal total = BigDecimal.ZERO;

    for (CartItem item : items) {
      Product product = item.getProduct();
      if (product.getStock() < item.getQuantity()) {
        throw new IllegalStateException("Not enough stock for " + product.getName());
      }
      product.setStock(product.getStock() - item.getQuantity());
      productRepository.save(product);
      total = total.add(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
    }

    Order order = new Order();
    order.setCustomerName(customerName);
    order.setAddress(address);
    order.setPaymentMode(paymentMode);
    order.setTotalAmount(total);

    Order savedOrder = orderRepository.save(order);
    cartItemRepository.deleteAll();

    return savedOrder;
  }
}
