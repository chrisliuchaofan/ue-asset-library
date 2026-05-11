import {
  addMember,
  createTeam,
  generateSlug,
  getMemberRole,
  getTeamBySlug,
  getTeamMembers,
} from '@/lib/team/team-service';

export async function addToDefaultCompanyTeam(email: string) {
  const configuredSlug = process.env.COMPANY_TEAM_SLUG?.trim();
  const teamName = process.env.COMPANY_TEAM_NAME?.trim() || '爆款工坊团队';
  const baseSlug = generateSlug(configuredSlug || teamName);
  let team = await getTeamBySlug(baseSlug);

  if (!team) {
    try {
      team = await createTeam({
        name: teamName,
        slug: baseSlug,
        createdBy: email,
        description: '公司邮箱自动注册创建的默认团队',
      });
    } catch (error) {
      team = await getTeamBySlug(baseSlug);
      if (!team) {
        throw error;
      }
      const existingRole = await getMemberRole(team.id, email);
      if (existingRole) {
        return { teamName: team.name, role: existingRole };
      }

      const members = await getTeamMembers(team.id);
      const role = members.some((member) => member.role === 'owner') ? 'member' : 'owner';
      await addMember(team.id, email, role);
      return { teamName: team.name, role };
    }
    return { teamName: team.name, role: 'owner' as const };
  }

  const existingRole = await getMemberRole(team.id, email);
  if (existingRole) {
    return { teamName: team.name, role: existingRole };
  }

  const members = await getTeamMembers(team.id);
  const role = members.some((member) => member.role === 'owner') ? 'member' : 'owner';
  await addMember(team.id, email, role);
  return { teamName: team.name, role };
}
