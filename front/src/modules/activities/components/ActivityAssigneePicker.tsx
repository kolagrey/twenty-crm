import { Activity } from '@/activities/types/Activity';
import { useUpdateOneObjectRecord } from '@/object-record/hooks/useUpdateOneObjectRecord';
import { useFilteredSearchEntityQuery } from '@/search/hooks/useFilteredSearchEntityQuery';
import { SingleEntitySelect } from '@/ui/input/relation-picker/components/SingleEntitySelect';
import { relationPickerSearchFilterScopedState } from '@/ui/input/relation-picker/states/relationPickerSearchFilterScopedState';
import { EntityForSelect } from '@/ui/input/relation-picker/types/EntityForSelect';
import { Entity } from '@/ui/input/relation-picker/types/EntityTypeForSelect';
import { useRecoilScopedState } from '@/ui/utilities/recoil-scope/hooks/useRecoilScopedState';
import { WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';
import {
  useGetWorkspaceMembersLazyQuery,
  useSearchUserQuery,
} from '~/generated/graphql';

export type ActivityAssigneePickerProps = {
  activity: Pick<Activity, 'id'> & {
    accountOwner?: Pick<
      WorkspaceMember,
      'id' | 'firstName' | 'lastName'
    > | null;
  };
  onSubmit?: () => void;
  onCancel?: () => void;
};

type UserForSelect = EntityForSelect & {
  entityType: Entity.User;
};

export const ActivityAssigneePicker = ({
  activity,
  onSubmit,
  onCancel,
}: ActivityAssigneePickerProps) => {
  const [relationPickerSearchFilter] = useRecoilScopedState(
    relationPickerSearchFilterScopedState,
  );
  const { updateOneObject } = useUpdateOneObjectRecord({
    objectNameSingular: 'ActivityV2',
  });
  const [getWorkspaceMember] = useGetWorkspaceMembersLazyQuery();

  const users = useFilteredSearchEntityQuery({
    queryHook: useSearchUserQuery,
    filters: [
      {
        fieldNames: ['firstName', 'lastName'],
        filter: relationPickerSearchFilter,
      },
    ],
    orderByField: 'firstName',
    mappingFunction: (user) => ({
      entityType: Entity.User,
      id: user.id,
      name: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarType: 'rounded',
      avatarUrl: user.avatarUrl ?? '',
      originalEntity: user,
    }),
    selectedIds: activity?.accountOwner?.id ? [activity?.accountOwner?.id] : [],
  });

  const handleEntitySelected = async (
    selectedUser: UserForSelect | null | undefined,
  ) => {
    if (selectedUser) {
      const workspaceMemberAssignee = (
        await getWorkspaceMember({
          variables: {
            where: {
              userId: { equals: selectedUser.id },
            },
          },
        })
      ).data?.workspaceMembers?.[0];

      updateOneObject?.({
        idToUpdate: activity.id,
        input: {
          assignee: { connect: { id: selectedUser.id } },
          workspaceMemberAssignee: {
            connect: { id: workspaceMemberAssignee?.id },
          },
        },
      });
    }

    onSubmit?.();
  };

  return (
    <SingleEntitySelect
      entitiesToSelect={users.entitiesToSelect}
      loading={users.loading}
      onCancel={onCancel}
      onEntitySelected={handleEntitySelected}
      selectedEntity={users.selectedEntities[0]}
    />
  );
};
