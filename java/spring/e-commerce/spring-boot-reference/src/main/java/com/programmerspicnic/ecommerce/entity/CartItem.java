package com.programmerspicnic.ecommerce.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cart_items")
public class CartItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Product product;

  private Integer quantity;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Product getProduct() { return product; }
  public void setProduct(Product product) { this.product = product; }
  public Integer getQuantity() { return quantity; }
  public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
