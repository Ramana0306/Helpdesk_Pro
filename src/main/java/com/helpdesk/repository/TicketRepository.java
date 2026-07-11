package com.helpdesk.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.model.Ticket;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByTicketId(String ticketId);
    List<Ticket> findByStatus(String status);
    List<Ticket> findByCreatedById(Long userId);
    List<Ticket> findByAssignedToId(Long engineerId);
    List<Ticket> findByAssignedToIdAndStatusNot(Long engineerId, String status);
}