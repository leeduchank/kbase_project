package com.kbase.project.repository;

import com.kbase.project.entity.InvitationStatus;
import com.kbase.project.entity.ProjectInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, Long> {
    List<ProjectInvitation> findByInviteeEmailAndStatusOrderByCreatedAtDesc(String email, InvitationStatus status);
    List<ProjectInvitation> findByProjectIdAndStatusOrderByCreatedAtDesc(Long projectId, InvitationStatus status);
    boolean existsByProjectIdAndInviteeEmailAndStatus(Long projectId, String email, InvitationStatus status);
    void deleteByProject_Id(Long projectId);
}
