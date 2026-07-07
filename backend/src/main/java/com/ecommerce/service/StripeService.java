package com.ecommerce.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecommerce.entity.Order;
import com.ecommerce.entity.OrderItem;
import com.ecommerce.entity.OrderTransaction;
import com.ecommerce.entity.Product;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.OrderTransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.param.checkout.SessionRetrieveParams;
import com.stripe.model.Transfer;
import com.stripe.param.TransferCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

        private final OrderRepository orderRepository;
        private final OrderTransactionRepository txRepo;
        private final org.springframework.core.env.Environment environment;

        @PostConstruct
        public void init() {
                String stripeSecret = environment.getProperty("stripe.secret.key");
                if (stripeSecret != null) {
                        com.stripe.Stripe.apiKey = stripeSecret;
                        log.info("Stripe API key initialized");
                } else {
                        log.warn("Stripe secret key not found in configuration");
                }
        }

        @Transactional
        public String createCheckoutSessionForOrder(Order order, String currency, String platform)
                        throws StripeException, JsonProcessingException {
                log.info("Creating Stripe checkout session for order: {}", order.getOrderId());

                // Use the order directly - it's already fully loaded in CheckoutService
                // No need to reload as it causes transaction visibility issues
                log.info("Order {} has {} shop orders",
                                order.getOrderId(),
                                order.getShopOrders() != null ? order.getShopOrders().size() : 0);

                // Look up transaction directly if not found on order
                OrderTransaction tx = order.getOrderTransaction();
                if (tx == null) {
                        tx = txRepo.findByOrderId(order.getOrderId())
                                        .orElseThrow(() -> new RuntimeException("Transaction not found for order: "
                                                        + order.getOrderId()));
                        // Ensure the bidirectional relationship is set for future use in this session
                        order.setOrderTransaction(tx);
                }

                // Validate that we have shop orders
                if (order.getShopOrders() == null || order.getShopOrders().isEmpty()) {
                        log.error("Order {} has no shop orders - cannot create Stripe session", order.getOrderId());
                        throw new IllegalStateException("Order has no shop orders. Cannot create checkout session.");
                }

                List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();
                BigDecimal totalAmountCalculated = BigDecimal.ZERO;

                for (com.ecommerce.entity.ShopOrder so : order.getShopOrders()) {
                        log.info("Processing ShopOrder: {} from Shop: {}", so.getShopOrderCode(),
                                        so.getShop().getName());

                        // Validate shop order has items
                        if (so.getItems() == null || so.getItems().isEmpty()) {
                                log.warn("ShopOrder {} has no items - skipping", so.getShopOrderCode());
                                continue;
                        }

                        // Add items for this shop
                        for (OrderItem item : so.getItems()) {
                                BigDecimal price = item.getPrice();
                                BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
                                BigDecimal itemTotal = price.multiply(quantity);
                                totalAmountCalculated = totalAmountCalculated.add(itemTotal);

                                Product product = item.getEffectiveProduct();
                                String shopName = so.getShop().getName();

                                long unitAmount;
                                if ("rwf".equalsIgnoreCase(currency)) {
                                        unitAmount = price.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
                                } else {
                                        unitAmount = price.multiply(BigDecimal.valueOf(100)).longValue();
                                }

                                SessionCreateParams.LineItem.PriceData.ProductData productData = SessionCreateParams.LineItem.PriceData.ProductData
                                                .builder()
                                                .setName(product.getProductName() + " (from " + shopName + ")")
                                                .build();

                                SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData
                                                .builder()
                                                .setCurrency(currency)
                                                .setUnitAmount(unitAmount)
                                                .setProductData(productData)
                                                .build();

                                SessionCreateParams.LineItem li = SessionCreateParams.LineItem.builder()
                                                .setPriceData(priceData)
                                                .setQuantity(Long.valueOf(item.getQuantity()))
                                                .build();
                                lineItems.add(li);
                                log.info("Added line item: {} ({} x {})", product.getProductName(), item.getQuantity(),
                                                unitAmount);
                        }

                        // Add shipping for this shop
                        if (so.getShippingCost() != null && so.getShippingCost().compareTo(BigDecimal.ZERO) > 0) {
                                BigDecimal shippingCost = so.getShippingCost();
                                totalAmountCalculated = totalAmountCalculated.add(shippingCost);

                                long shippingAmount;
                                if ("rwf".equalsIgnoreCase(currency)) {
                                        shippingAmount = shippingCost.setScale(0, java.math.RoundingMode.HALF_UP)
                                                        .longValue();
                                } else {
                                        shippingAmount = shippingCost.multiply(BigDecimal.valueOf(100)).longValue();
                                }

                                lineItems.add(SessionCreateParams.LineItem.builder()
                                                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                                                .setCurrency(currency)
                                                                .setUnitAmount(shippingAmount)
                                                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData
                                                                                .builder()
                                                                                .setName("Shipping: " + so.getShop()
                                                                                                .getName())
                                                                                .build())
                                                                .build())
                                                .setQuantity(1L)
                                                .build());
                                log.info("Added shipping for shop {}: {}", so.getShop().getName(), shippingAmount);
                        }

                        // Add packaging fee for this shop
                        if (so.getPackagingFee() != null && so.getPackagingFee().compareTo(BigDecimal.ZERO) > 0) {
                                BigDecimal packagingFee = so.getPackagingFee();
                                totalAmountCalculated = totalAmountCalculated.add(packagingFee);

                                long packagingAmount;
                                if ("rwf".equalsIgnoreCase(currency)) {
                                        packagingAmount = packagingFee.setScale(0, java.math.RoundingMode.HALF_UP)
                                                        .longValue();
                                } else {
                                        packagingAmount = packagingFee.multiply(BigDecimal.valueOf(100)).longValue();
                                }

                                lineItems.add(SessionCreateParams.LineItem.builder()
                                                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                                                .setCurrency(currency)
                                                                .setUnitAmount(packagingAmount)
                                                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData
                                                                                .builder()
                                                                                .setName("Packaging: " + so.getShop()
                                                                                                .getName())
                                                                                .build())
                                                                .build())
                                                .setQuantity(1L)
                                                .build());
                                log.info("Added packaging fee for shop {}: {}", so.getShop().getName(),
                                                packagingAmount);
                        }
                }

                log.info("Final Calculated Total for Stripe: {} RWF", totalAmountCalculated);
                log.info("Expected total from OrderInfo: {} RWF", order.getOrderInfo().getTotalAmount());


                BigDecimal expectedTotal = order.getOrderInfo().getTotalAmount();

                if ("rwf".equalsIgnoreCase(currency) && expectedTotal.compareTo(new BigDecimal("750")) < 0) {
                        log.error("Total order amount {} RWF is below Stripe's minimum requirement of 750 RWF.",
                                        expectedTotal);
                        throw new IllegalArgumentException("The total order amount (" + expectedTotal
                                        + " RWF) is too small for card payment. Minimum required is 750 RWF.");
                }

                // Verify calculated matches expected (with small tolerance for rounding)
                BigDecimal difference = totalAmountCalculated.subtract(expectedTotal).abs();
                if (difference.compareTo(new BigDecimal("5")) > 0) {
                        log.warn("Calculated total ({}) differs from expected total ({}) by {} RWF",
                                        totalAmountCalculated, expectedTotal, difference);
                }

                // Validate we have line items
                if (lineItems.isEmpty()) {
                        log.error("No line items created for order {}", order.getOrderId());
                        throw new IllegalStateException("Cannot create Stripe session with no line items");
                }

                Map<String, String> metadata = Map.of(
                                "orderId", order.getOrderId().toString(),
                                "orderCode", order.getOrderCode());

                String webSuccess = "https://shopsphere-new.vercel.app/payment-success";
                String webCancel = "https://shopsphere-new.vercel.app/payment-cancel";
                String mobSuccess = "agrochainn://checkout-redirect";
                String mobCancel = "agrochainn://checkout-redirect";
                String successUrl;
                String cancelUrl;
                if (platform != null && platform.equalsIgnoreCase("mobile")) {
                        log.info("Creating Stripe session for MOBILE platform - using deep link redirects");
                        successUrl = mobSuccess + "?status=success&session_id={CHECKOUT_SESSION_ID}";
                        cancelUrl = mobCancel + "?status=cancel&session_id={CHECKOUT_SESSION_ID}";
                } else {
                        log.info("Creating Stripe session for WEB platform (platform value: {})", platform);
                        successUrl = webSuccess;
                        cancelUrl = webCancel;
                }

                SessionCreateParams params = SessionCreateParams.builder()
                                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                                .setMode(SessionCreateParams.Mode.PAYMENT)
                                .addAllLineItem(lineItems)
                                .putAllMetadata(metadata)
                                .setSuccessUrl(successUrl + (platform != null && platform.equalsIgnoreCase("mobile") ? "" : "?session_id={CHECKOUT_SESSION_ID}"))
                                .setCancelUrl(cancelUrl + (platform != null && platform.equalsIgnoreCase("mobile") ? "" : "?session_id={CHECKOUT_SESSION_ID}"))
                                .build();

                Session session = Session.create(params);
                log.info("Stripe session created with ID: {}", session.getId());

                // update transaction with stripe session id
                tx.setStripeSessionId(session.getId());
                txRepo.save(tx);
                log.info("Transaction updated with Stripe session ID");

                return session.getUrl();
        }

        @Transactional
        public String createCheckoutSessionForHybridPayment(Order order, String currency, String platform,
                        BigDecimal reducedAmount)
                        throws StripeException, JsonProcessingException {
                log.info("Creating Stripe checkout session for HYBRID payment - order: {}, reduced amount: {}",
                                order.getOrderId(), reducedAmount);

                // Use the order directly - no need to reload
                log.info("Order {} has {} shop orders",
                                order.getOrderId(),
                                order.getShopOrders() != null ? order.getShopOrders().size() : 0);

                // Validate minimum amount for hybrid payment
                if ("rwf".equalsIgnoreCase(currency) && reducedAmount.compareTo(new BigDecimal("750")) < 0) {
                        log.error("Reduced amount {} RWF is below Stripe's minimum requirement of 750 RWF for hybrid payment.",
                                        reducedAmount);
                        throw new IllegalArgumentException("The remaining amount after points redemption ("
                                        + reducedAmount
                                        + " RWF) is too small for card payment. Minimum required is 750 RWF.");
                }

                // For hybrid payments, create a single line item with the reduced amount
                long reducedAmountUnits;
                if ("rwf".equalsIgnoreCase(currency)) {
                        reducedAmountUnits = reducedAmount.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
                } else {
                        reducedAmountUnits = reducedAmount.multiply(BigDecimal.valueOf(100)).longValue();
                }

                SessionCreateParams.LineItem.PriceData.ProductData productData = SessionCreateParams.LineItem.PriceData.ProductData
                                .builder()
                                .setName("Order #" + order.getOrderCode() + " (After Points Discount)")
                                .setDescription("Remaining amount after points redemption")
                                .build();

                SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData
                                .builder()
                                .setCurrency(currency)
                                .setUnitAmount(reducedAmountUnits)
                                .setProductData(productData)
                                .build();

                SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                                .setPriceData(priceData)
                                .setQuantity(1L)
                                .build();

                List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();
                lineItems.add(lineItem);

                Map<String, String> metadata = Map.of(
                                "orderId", order.getOrderId().toString(),
                                "orderCode", order.getOrderCode(),
                                "paymentType", "hybrid",
                                "pointsUsed", order.getOrderTransaction().getPointsUsed().toString(),
                                "pointsValue", order.getOrderTransaction().getPointsValue().toString());

                String webSuccess = "https://shopsphere-new.vercel.app/payment-success";
                String webCancel = "https://shopsphere-new.vercel.app/payment-cancel";
                String mobSuccess = "agrochainn://checkout-redirect";
                String mobCancel = "agrochainn://checkout-redirect";
                String successUrl;
                String cancelUrl;
                if (platform != null && platform.equalsIgnoreCase("mobile")) {
                        successUrl = mobSuccess + "?status=success&session_id={CHECKOUT_SESSION_ID}";
                        cancelUrl = mobCancel + "?status=cancel&session_id={CHECKOUT_SESSION_ID}";
                } else {
                        successUrl = webSuccess;
                        cancelUrl = webCancel;
                }

                SessionCreateParams params = SessionCreateParams.builder()
                                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                                .setMode(SessionCreateParams.Mode.PAYMENT)
                                .addAllLineItem(lineItems)
                                .putAllMetadata(metadata)
                                .setSuccessUrl(successUrl + (platform != null && platform.equalsIgnoreCase("mobile") ? "" : "?session_id={CHECKOUT_SESSION_ID}"))
                                .setCancelUrl(cancelUrl + (platform != null && platform.equalsIgnoreCase("mobile") ? "" : "?session_id={CHECKOUT_SESSION_ID}"))
                                .build();

                Session session = Session.create(params);
                log.info("Stripe HYBRID session created with ID: {}, amount: {}", session.getId(), reducedAmount);

                OrderTransaction tx = order.getOrderTransaction();
                tx.setStripeSessionId(session.getId());
                if (session.getPaymentIntent() != null) {
                        tx.setStripePaymentIntentId(session.getPaymentIntent());
                        log.info("Payment intent ID set: {}", session.getPaymentIntent());
                }
                txRepo.save(tx);
                log.info("Transaction updated with Stripe session ID and payment intent ID for hybrid payment");

                return session.getUrl();
        }

        @Transactional(readOnly = true)
        public Session retrieveSession(String sessionId) throws StripeException {
                log.info("Retrieving Stripe session: {}", sessionId);

                SessionRetrieveParams params = SessionRetrieveParams.builder()
                                .addExpand("payment_intent")
                                .build();

                Session session = Session.retrieve(sessionId, params, null);
                log.info("Stripe session retrieved successfully: {}", sessionId);

                return session;
        }

        /**
         * Process refund via Stripe
         * 
         * @param paymentIntentId The Stripe payment intent ID
         * @param refundAmount    The amount to refund
         * @return The Stripe Refund object
         * @throws StripeException if refund fails
         */
        @Transactional
        public Refund processRefund(String paymentIntentId, BigDecimal refundAmount, String currency)
                        throws StripeException {
                log.info("Processing Stripe refund for payment intent: {}, amount: {}, currency: {}", paymentIntentId,
                                refundAmount, currency);

                long amountInUnits;
                if ("rwf".equalsIgnoreCase(currency)) {
                        amountInUnits = refundAmount.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
                } else {
                        amountInUnits = refundAmount.multiply(BigDecimal.valueOf(100)).longValue();
                }

                RefundCreateParams params = RefundCreateParams.builder()
                                .setPaymentIntent(paymentIntentId)
                                .setAmount(amountInUnits)
                                .build();

                Refund refund = Refund.create(params);

                log.info("Stripe refund created successfully. Refund ID: {}, Status: {}, Amount: {}",
                                refund.getId(), refund.getStatus(), refund.getAmount());

                return refund;
        }

        @Transactional
        public String transferFundsToShop(String connectedAccountId, BigDecimal amount, String currency,
                        String orderCode)
                        throws StripeException {
                log.info("Transferring funds to shop account: {}, amount: {}, currency: {}",
                                connectedAccountId, amount, currency);

                long amountInUnits;
                if ("rwf".equalsIgnoreCase(currency)) {
                        amountInUnits = amount.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
                } else {
                        amountInUnits = amount.multiply(BigDecimal.valueOf(100)).longValue();
                }

                TransferCreateParams params = TransferCreateParams.builder()
                                .setAmount(amountInUnits)
                                .setCurrency(currency)
                                .setDestination(connectedAccountId)
                                .setDescription("Payout for Order #" + orderCode)
                                .putMetadata("orderCode", orderCode)
                                .build();

                Transfer transfer = Transfer.create(params);

                log.info("Funds transferred successfully. Transfer ID: {}", transfer.getId());
                return transfer.getId();
        }
}