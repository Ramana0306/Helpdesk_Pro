package com.helpdesk.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendTestEmail(String to) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("HelpDesk - Test Email");
        message.setText("This is a test email from HelpDesk Pro.\n\nIf you received this, email is working!");
        mailSender.send(message);
    }

    public void sendTicketCreatedEmail(String to, String ticketId, String title) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("HelpDesk - Ticket Created: " + ticketId);
            message.setText("Hello,\n\nYour ticket has been created successfully.\n\n" +
                    "Ticket ID: " + ticketId + "\n" +
                    "Title: " + title + "\n\n" +
                    "We will update you once an engineer is assigned.\n\n" +
                    "Regards,\nHelpDesk Team");
            mailSender.send(message);
            System.out.println("✅ Email sent to " + to + " for ticket " + ticketId);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    public void sendTicketAssignedEmail(String to, String ticketId, String title, String engineerName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("HelpDesk - Ticket Assigned: " + ticketId);
            message.setText("Hello,\n\nYour ticket has been assigned to an engineer.\n\n" +
                    "Ticket ID: " + ticketId + "\n" +
                    "Title: " + title + "\n" +
                    "Assigned Engineer: " + engineerName + "\n\n" +
                    "Our engineer will start working on it soon.\n\n" +
                    "Regards,\nHelpDesk Team");
            mailSender.send(message);
            System.out.println("✅ Assignment email sent to " + to);
        } catch (Exception e) {
            System.err.println("❌ Failed to send assignment email: " + e.getMessage());
        }
    }

    public void sendTicketResolvedEmail(String to, String ticketId, String title) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("HelpDesk - Ticket Resolved: " + ticketId);
            message.setText("Hello,\n\nYour ticket has been resolved.\n\n" +
                    "Ticket ID: " + ticketId + "\n" +
                    "Title: " + title + "\n\n" +
                    "Please log in to verify the resolution. If you are satisfied, you can close the ticket.\n\n" +
                    "Regards,\nHelpDesk Team");
            mailSender.send(message);
            System.out.println("✅ Resolution email sent to " + to);
        } catch (Exception e) {
            System.err.println("❌ Failed to send resolution email: " + e.getMessage());
        }
    }
}