package com.programmerspicnic.ecommerce.repository;

import com.programmerspicnic.ecommerce.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
}
