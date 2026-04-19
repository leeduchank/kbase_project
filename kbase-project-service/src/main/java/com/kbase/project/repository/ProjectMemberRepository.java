package com.kbase.project.repository;

import com.kbase.project.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    boolean existsByProjectIdAndMemberId(Long projectId, String memberId);
    Optional<ProjectMember> findByProjectIdAndMemberId(Long projectId, String memberId);
}