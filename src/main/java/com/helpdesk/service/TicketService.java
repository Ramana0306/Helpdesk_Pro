package com.helpdesk.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.helpdesk.model.Ticket;
import com.helpdesk.model.User;
import com.helpdesk.repository.TicketRepository;
import com.helpdesk.repository.UserRepository;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    public TicketService(TicketRepository ticketRepository, UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public Optional<Ticket> getTicketById(Long id) {
        return ticketRepository.findById(id);
    }

    public Ticket createTicket(Ticket ticket, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        ticket.setCreatedBy(user);
        ticket.setCreatedAt(LocalDateTime.now());
        if (ticket.getStatus() == null) {
            ticket.setStatus("OPEN");
        }

        ticket.setTicketId("TKT-" + System.currentTimeMillis());

        Ticket saved = ticketRepository.save(ticket);

        // Log notification (no email - just console)
        System.out.println("📧 TICKET CREATED: " + saved.getTicketId() + " by " + user.getEmail());

        return saved;
    }

    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository.findByCreatedById(userId);
    }

    public List<Ticket> getTicketsByEngineer(Long engineerId) {
        return ticketRepository.findByAssignedToId(engineerId);
    }

    public List<Ticket> getTicketsByStatus(String status) {
        return ticketRepository.findByStatus(status);
    }

    public Ticket assignTicket(Long ticketId, Long engineerId) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        User engineer = userRepository.findById(engineerId)
            .orElseThrow(() -> new RuntimeException("Engineer not found"));

        ticket.setAssignedTo(engineer);
        if ("OPEN".equals(ticket.getStatus())) {
            ticket.setStatus("IN_PROGRESS");
        }

        Ticket saved = ticketRepository.save(ticket);

        System.out.println("📧 TICKET ASSIGNED: " + saved.getTicketId() + " to " + engineer.getFullName());

        return saved;
    }

    public Ticket updateStatus(Long ticketId, String status) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        ticket.setStatus(status);

        if ("RESOLVED".equals(status)) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        Ticket saved = ticketRepository.save(ticket);

        System.out.println("📧 TICKET STATUS: " + saved.getTicketId() + " is now " + status);

        return saved;
    }

    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }
}