import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  return {
    roomId: params.roomId,
    inviteToken: params.token,
  };
};
