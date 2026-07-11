package com.helpdesk.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.helpdesk.model.Ticket;
import com.helpdesk.model.User;
import com.helpdesk.repository.TicketRepository;
import com.helpdesk.repository.UserRepository;

@Service
public class TicketService {
    
    @Autowired
    private TicketRepository ticketRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    // Employee creates ticket → Status OPEN, no engineer assigned
    public Ticket createTicket(Ticket ticket, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ticket.setCreatedBy(user);
        ticket.setStatus("OPEN");
        ticket.setTicketId(generateTicketId());
        
        return ticketRepository.save(ticket);
    }
    
    private String generateTicketId() {
        String year = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy"));
        long count = ticketRepository.count() + 1;
        return String.format("HD-%s-%05d", year, count);
    }
    
    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }
    
    public Optional<Ticket> getTicketById(Long id) {
        return ticketRepository.findById(id);
    }
    
    public Optional<Ticket> getTicketByTicketId(String ticketId) {
        return ticketRepository.findByTicketId(ticketId);
    }
    
    public List<Ticket> getTicketsByStatus(String status) {
        return ticketRepository.findByStatus(status);
    }
    
    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository.findByCreatedById(userId);
    }
    
    // Get tickets assigned to a specific engineer
    public List<Ticket> getTicketsByEngineer(Long engineerId) {
        return ticketRepository.findByAssignedToId(engineerId);
    }
    
    // Admin assigns ticket to engineer → Status becomes ASSIGNED
    public Ticket assignTicket(Long ticketId, Long engineerId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        
        User engineer = userRepository.findById(engineerId)
                .orElseThrow(() -> new RuntimeException("Engineer not found"));
        
        if (!"ENGINEER".equals(engineer.getRole())) {
            throw new RuntimeException("User is not an engineer!");
        }
        
        ticket.setAssignedTo(engineer);
        ticket.setStatus("ASSIGNED");
        
        return ticketRepository.save(ticket);
    }
    
    public Ticket updateStatus(Long ticketId, String status) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        
        List<String> validStatuses = List.of("OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED");
        
        if (!validStatuses.contains(status)) {
            throw new RuntimeException("Invalid status!");
        }
        
        ticket.setStatus(status);
        
        if ("RESOLVED".equals(status)) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        
        return ticketRepository.save(ticket);
    }
}