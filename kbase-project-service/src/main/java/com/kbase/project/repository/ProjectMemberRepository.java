package com.kbase.project.repository;

import com.kbase.project.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    boolean existsByProjectIdAndMemberId(Long projectId, String memberId);
    Optional<ProjectMember> findByProjectIdAndMemberId(Long projectId, String memberId);
    List<ProjectMember> findAllByMemberId(String memberId);

    @Modifying
    @Query("DELETE FROM ProjectMember pm WHERE pm.memberId = :memberId")
    int deleteByMemberId(@Param("memberId") String memberId);
}