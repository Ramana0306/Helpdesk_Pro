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
    private final EmailService emailService;

    public TicketService(TicketRepository ticketRepository, UserRepository userRepository, EmailService emailService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
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

        // Generate ticket ID
        ticket.setTicketId("TKT-" + System.currentTimeMillis());

        Ticket saved = ticketRepository.save(ticket);

        // Send email notification
        try {
            if (user.getEmail() != null && !user.getEmail().isEmpty()) {
                emailService.sendTicketCreatedEmail(
                    user.getEmail(),
                    saved.getTicketId(),
                    saved.getTitle()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Email notification failed (non-critical): " + e.getMessage());
        }

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

        // Send email notification
        try {
            if (saved.getCreatedBy() != null && saved.getCreatedBy().getEmail() != null) {
                emailService.sendTicketAssignedEmail(
                    saved.getCreatedBy().getEmail(),
                    saved.getTicketId(),
                    saved.getTitle(),
                    engineer.getFullName()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Assignment email failed (non-critical): " + e.getMessage());
        }

        return saved;
    }

    public Ticket updateStatus(Long ticketId, String status) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));

        String oldStatus = ticket.getStatus();
        ticket.setStatus(status);

        if ("RESOLVED".equals(status)) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        Ticket saved = ticketRepository.save(ticket);

        // Send email notification on resolve
        try {
            if (!"RESOLVED".equals(oldStatus) && "RESOLVED".equals(status)) {
                if (saved.getCreatedBy() != null && saved.getCreatedBy().getEmail() != null) {
                    emailService.sendTicketResolvedEmail(
                        saved.getCreatedBy().getEmail(),
                        saved.getTicketId(),
                        saved.getTitle()
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Resolution email failed (non-critical): " + e.getMessage());
        }

        return saved;
    }

    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }
}