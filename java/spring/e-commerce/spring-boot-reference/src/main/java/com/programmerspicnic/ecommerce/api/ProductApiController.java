package com.programmerspicnic.ecommerce.api;

import com.programmerspicnic.ecommerce.entity.Product;
import com.programmerspicnic.ecommerce.repository.ProductRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductApiController {
  private final ProductRepository productRepository;

  public ProductApiController(ProductRepository productRepository) {
    this.productRepository = productRepository;
  }

  @GetMapping
  public List<Product> all() {
    return productRepository.findAll();
  }
}
