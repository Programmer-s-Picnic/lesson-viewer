package com.programmerspicnic.ecommerce.repository;

import com.programmerspicnic.ecommerce.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
