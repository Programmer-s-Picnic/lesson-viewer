package com.programmerspicnic.ecommerce.service;

import com.programmerspicnic.ecommerce.entity.CartItem;
import com.programmerspicnic.ecommerce.entity.Product;
import com.programmerspicnic.ecommerce.repository.CartItemRepository;
import com.programmerspicnic.ecommerce.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CartService {
  private final ProductRepository productRepository;
  private final CartItemRepository cartItemRepository;

  public CartService(ProductRepository productRepository, CartItemRepository cartItemRepository) {
    this.productRepository = productRepository;
    this.cartItemRepository = cartItemRepository;
  }

  public List<CartItem> findAll() {
    return cartItemRepository.findAll();
  }

  @Transactional
  public CartItem addToCart(Long productId, int quantity) {
    Product product = productRepository.findById(productId)
        .orElseThrow(() -> new IllegalArgumentException("Product not found"));

    if (quantity <= 0) {
      throw new IllegalArgumentException("Quantity must be positive");
    }

    CartItem item = new CartItem();
    item.setProduct(product);
    item.setQuantity(quantity);
    return cartItemRepository.save(item);
  }

  @Transactional
  public void clearCart() {
    cartItemRepository.deleteAll();
  }
}
