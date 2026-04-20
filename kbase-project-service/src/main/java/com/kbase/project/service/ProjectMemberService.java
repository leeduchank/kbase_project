package com.kbase.project.service;

import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository; // Inject thêm ProjectRepository

    @Transactional
    public void deleteAllUserData(String userId) {
        int removedMembers = projectMemberRepository.deleteByMemberId(userId);

        int removedProjects = projectRepository.deleteByOwnerId(userId); // Giả sử entity Project của bạn có cột ownerId

        System.out.println("Đã xóa " + removedProjects + " dự án và " + removedMembers + " quyền thành viên của User: " + userId);
    }
    @Transactional
    public int deleteMembershipsByUserId(String userId) {
        return projectMemberRepository.deleteByMemberId(userId);
    }
}