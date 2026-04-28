package com.kbase.project.service;

import com.kbase.project.entity.Project;
import com.kbase.project.repository.ActivityRepository;
import com.kbase.project.repository.ProjectInvitationRepository;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectInvitationRepository projectInvitationRepository;
    private final ActivityRepository activityRepository;

    /**
     * Handle user deactivation: remove the user's memberships from projects
     * where they are NOT the owner. Projects owned by this user are preserved.
     */
    @Transactional
    public void handleUserDeactivated(String userId) {
        // Only remove memberships where the user is NOT the owner.
        // Projects owned by this user remain intact.
        int removedMemberships = projectMemberRepository.deleteNonOwnerMembershipsByUserId(userId);

        log.info("User {} deactivated: removed {} non-owner memberships. Owned projects are preserved.",
                userId, removedMemberships);
    }

    @Transactional
    public int deleteMembershipsByUserId(String userId) {
        return projectMemberRepository.deleteByMemberId(userId);
    }
}