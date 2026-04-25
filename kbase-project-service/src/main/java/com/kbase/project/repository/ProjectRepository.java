package com.kbase.project.repository;

import com.kbase.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerId(String ownerId);

    int deleteByOwnerId(String userId);

    @Query("SELECT p FROM Project p " +
            "JOIN ProjectMember pm ON p = pm.project " +
            "WHERE pm.memberId = :userId " +
            "ORDER BY p.createdAt DESC")
    List<Project> findAllByMemberUserId(@Param("userId") String userId);
}
