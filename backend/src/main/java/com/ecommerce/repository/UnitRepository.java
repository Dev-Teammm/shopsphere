package com.ecommerce.repository;

import com.ecommerce.entity.Unit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {

    List<Unit> findAllByOrderBySymbolAsc();

    Optional<Unit> findBySymbol(String symbol);

    Optional<Unit> findBySymbolIgnoreCase(String symbol);

    @Query("SELECT u FROM Unit u WHERE LOWER(u.symbol) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Unit> search(@Param("q") String q, Pageable pageable);
}
