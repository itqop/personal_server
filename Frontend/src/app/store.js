import { configureStore } from '@reduxjs/toolkit';
import appSlice from '../AppSlice'
import loginSlice from '../features/Login/slice'

export const store = configureStore({
  reducer: {
    app: appSlice,
    login: loginSlice,
  },
});
