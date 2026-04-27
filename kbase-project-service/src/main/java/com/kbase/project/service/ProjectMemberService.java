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

    @Transactional
    public void deleteAllUserData(String userId) {
        // 1. Tìm tất cả các dự án mà User này làm Owner
        List<Project> ownedProjects = projectRepository.findByOwnerId(userId);
        
        for (Project project : ownedProjects) {
            Long projectId = project.getId();
            // Xóa các bản ghi liên quan của dự án
            projectInvitationRepository.deleteByProject_Id(projectId);
            activityRepository.deleteByProjectId(projectId);
            
            // Xóa dự án (ProjectMember sẽ được xóa nhờ CascadeType.ALL và orphanRemoval trong Project entity)
            projectRepository.delete(project);
        }

        // 2. Xóa các quyền thành viên của User này trong các dự án khác (nơi họ không phải Owner)
        int removedMemberships = projectMemberRepository.deleteByMemberId(userId);

        log.info("Đã dọn dẹp dữ liệu User {}: Xóa {} dự án sở hữu và {} quyền thành viên.", 
                userId, ownedProjects.size(), removedMemberships);
    }
    @Transactional
    public int deleteMembershipsByUserId(String userId) {
        return projectMemberRepository.deleteByMemberId(userId);
    }
}