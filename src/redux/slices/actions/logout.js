// src/redux/actions/logout.js
import { signOut } from "../auth";
import { resetAppState } from "../app";
import { resetConversationState } from "../conversation";

export const logoutAll = () => (dispatch) => {
  dispatch(signOut());
  dispatch(resetAppState());
  dispatch(resetConversationState());
};
