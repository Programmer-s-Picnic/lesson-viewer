# 0 to Infinity Ecommerce App using Spring Boot, MySQL and Thymeleaf

This ZIP contains:

1. `index.html` — the complete lesson page.
2. `css/style.css` — saffron professional theme.
3. `js/app.js`, `js/cart.js`, `js/api-demo.js`, `js/speak.js` — lesson JavaScript files.
4. `assets/spring-boot-ecommerce-og.png` — SEO / social sharing image.
5. `spring-boot-reference/` — reference Spring Boot project structure and sample code.

## How to view the lesson

Open `index.html` in a browser.

## How to start the Spring Boot reference app

1. Create MySQL database:

```sql
CREATE DATABASE ecommerce_db;
```

2. Edit:

```text
spring-boot-reference/src/main/resources/application.properties
```

3. Put your MySQL username and password.

4. From inside `spring-boot-reference`, run:

```bash
mvn spring-boot:run
```

5. Open:

```text
http://localhost:8080/
http://localhost:8080/products
http://localhost:8080/api/products
```

## Note

The reference app is a teaching starter. It is intentionally simple so students can understand entities,
repositories, services, controllers, APIs, Thymeleaf pages, and transactions.
