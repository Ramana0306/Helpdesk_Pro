package com.helpdesk.controller;

import com.helpdesk.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "http://localhost:5173")
public class EmailTestController {

    private final EmailService emailService;

    public EmailTestController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/email")
    public ResponseEntity<?> testEmail(@RequestBody Map<String, String> request) {
        String to = request.get("to");

        if (to == null || to.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Email address is required");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            emailService.sendTestEmail(to);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Email sent successfully to " + to);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Email failed: " + e.getMessage());
            if (e.getCause() != null) {
                error.put("cause", e.getCause().getMessage());
            }
            return ResponseEntity.badRequest().body(error);
        }
    }
}