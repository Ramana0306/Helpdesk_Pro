package com.helpdesk.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.helpdesk.model.Ticket;
import com.helpdesk.model.User;
import com.helpdesk.repository.TicketRepository;
import com.helpdesk.repository.UserRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public UserService(UserRepository userRepository, TicketRepository ticketRepository) {
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
    }

    // ========== USER CRUD ==========

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User createUser(User user) {
        // Check for duplicate username
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new RuntimeException("Username '" + user.getUsername() + "' already exists");
        }
        // Check for duplicate email
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email '" + user.getEmail() + "' already exists");
        }
        return userRepository.save(user);
    }

    public User updateUser(Long id, User updatedUser) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFullName(updatedUser.getFullName());
        user.setEmail(updatedUser.getEmail());
        user.setUsername(updatedUser.getUsername());
        user.setRole(updatedUser.getRole());
        user.setActive(updatedUser.isActive());
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
            user.setPassword(updatedUser.getPassword());
        }
        return userRepository.save(user);
    }

    // ========== DELETE USER WITH ADMIN PROTECTION ==========

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // BLOCK: Admin users cannot be deleted
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Admin users cannot be deleted");
        }

        // Find admin to reassign tickets to
        User admin = userRepository.findByRole("ADMIN")
            .stream().findFirst()
            .orElseThrow(() -> new RuntimeException("No admin found to reassign tickets"));

        // Use native SQL to reassign tickets — bypasses Hibernate entity issues
        entityManager.createNativeQuery(
            "UPDATE tickets SET assigned_to = :adminId WHERE assigned_to = :userId"
        )
        .setParameter("adminId", admin.getId())
        .setParameter("userId", id)
        .executeUpdate();

        entityManager.createNativeQuery(
            "UPDATE tickets SET created_by = :adminId WHERE created_by = :userId"
        )
        .setParameter("adminId", admin.getId())
        .setParameter("userId", id)
        .executeUpdate();

        // Flush to ensure updates are persisted
        entityManager.flush();

        // Now safely delete the user
        userRepository.deleteById(id);
    }

    // ========== TICKET STATS FOR DELETE WARNING ==========

    public Map<String, Integer> getUserTicketStats(Long userId) {
        List<Ticket> assignedTickets = ticketRepository.findByAssignedToId(userId);
        List<Ticket> createdTickets = ticketRepository.findByCreatedById(userId);

        int activeAssigned = (int) assignedTickets.stream()
            .filter(t -> !"CLOSED".equals(t.getStatus()))
            .count();

        int createdCount = createdTickets.size();

        return Map.of(
            "assignedTickets", activeAssigned,
            "createdTickets", createdCount
        );
    }

    // ========== ENGINEER WORKLOAD ==========

    public List<Map<String, Object>> getEngineerWorkload() {
        List<User> engineers = userRepository.findByRole("ENGINEER");
        return engineers.stream().map(eng -> {
            long activeCount = ticketRepository.findByAssignedToIdAndStatusNot(eng.getId(), "CLOSED").size();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", eng.getId());
            map.put("fullName", eng.getFullName());
            map.put("email", eng.getEmail());
            map.put("activeTickets", activeCount);
            map.put("available", activeCount < 5);
            return map;
        }).toList();
    }
}