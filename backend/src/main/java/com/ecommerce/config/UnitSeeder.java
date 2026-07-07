package com.ecommerce.config;

import com.ecommerce.entity.Unit;
import com.ecommerce.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds default system units (shopId = null) on startup if none exist.
 */
@Component
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class UnitSeeder implements ApplicationRunner {

    private final UnitRepository unitRepository;

    private static final List<Unit> DEFAULT_UNITS = List.of(
            new Unit(null, "kg", "Kilogram"),
            new Unit(null, "g", "Gram"),
            new Unit(null, "L", "Litre"),
            new Unit(null, "ml", "Millilitre"),
            new Unit(null, "pc", "Piece"),
            new Unit(null, "box", "Box"),
            new Unit(null, "bunch", "Bunch"),
            new Unit(null, "bag", "Bag"),
            new Unit(null, "dozen", "Dozen"),
            new Unit(null, "oz", "Ounce"),
            new Unit(null, "lb", "Pound")
    );

    @Override
    public void run(ApplicationArguments args) {
        if (unitRepository.count() == 0) {
            log.info("Seeding default system units");
            for (Unit u : DEFAULT_UNITS) {
                unitRepository.save(u);
            }
            log.info("Seeded {} default units", DEFAULT_UNITS.size());
        }
    }
}
