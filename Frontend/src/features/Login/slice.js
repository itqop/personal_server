/* eslint no-param-reassign: ["off"] */
import { createSlice } from '@reduxjs/toolkit';

export const loginSlice = createSlice({
  name: 'login',
  initialState: {
    isPasswordVisible: false,
  },
  reducers: {
    setPasswordVisible: (state, action) => {
      state.isPasswordVisible = action.payload.isPasswordVisible;
    },
  }
});

export const {
  setPasswordVisible,
} = loginSlice.actions;

export default loginSlice.reducer;
  