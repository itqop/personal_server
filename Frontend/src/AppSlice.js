/* eslint no-param-reassign: ["off"] */
import { createSlice } from '@reduxjs/toolkit';
import { dateToYYYYMMDDString } from './utils/date';

var defaultEndSelectionDate = dateToYYYYMMDDString(new Date())
const theDateBefore2Month = new Date()
theDateBefore2Month.setDate(theDateBefore2Month.getDay() - 60)
var defaultStartSelectionDate = dateToYYYYMMDDString(theDateBefore2Month)

export const appSlice = createSlice({
  name: 'app',
  initialState: {
    isLoggedIn: false,
    haveComplexesInfo: false,
    haveComplexesConfigInfo: false,
    haveUsersInfo: false,
    isFirstTimeLoading: true,
    updateTimestamp: 0,
    showModalToAcceptComplexDelete: false,
    showModalToAcceptComplexDeleteError: '',
    complexIdToDelete: 0,
    isSubmitting: false,
    showModalToEditConfiguration: false,
    complexIdToEdit: 0,
    showModalToComplexSettings: false,
    complexIdToSettings: 0,
    haveComplexSettingInfo: false,
    complexSettingsInfoRequestInProgress: false,
    selectedComplexIndex: -1,
    showModalToAcceptUserDelete: false,
    showModalToAcceptUserDeleteError: '',
    showModalToEditUser: false,
    userIdToEdit: '',
    userIdToDelete: '',
    selectedUserIndex: -1,
    needToChangePassword: false,
    filtersOpen: false,
    selectedComplexes: ['0'],
    selectedSensors: ['0'],
    sensorsDataUpdateInProgress: false,
    filtersDiapazone: {start: defaultStartSelectionDate, end: defaultEndSelectionDate},
    haveSensorsData: false,
    dialog: null,
    selectedDataType: 'tab',
  },
  reducers: {
    setLoggedState: (state, action) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      if (!state.isLoggedIn) {
        state.haveComplexesInfo = false
        state.haveComplexesConfigInfo = false
        state.haveUsersInfo = false
        state.haveSensorsData = false
        state.selectedComplexes = ['0']
        state.selectedSensors = ['0']
        state.isFirstTimeLoading = true

        const theDateBefore2Month = new Date()
        theDateBefore2Month.setDate(theDateBefore2Month.getDay() - 60)
        state.filtersDiapazone = {start: defaultStartSelectionDate, end: defaultEndSelectionDate}
      }
    },
    setComplexesInfo: (state, action) => {
      // console.log(`setComplexesInfoReceived ${JSON.stringify(state)} with ${JSON.stringify(action)}`)
      state.haveComplexesInfo = action.payload.haveComplexesInfo
    },
    setComplexesConfigInfo: (state, action) => {
      // console.log(`setComplexesConfigInfoReceived ${JSON.stringify(state)} with ${JSON.stringify(action)}`)
      state.haveComplexesConfigInfo = action.payload.haveComplexesConfigInfo
    },
    setUsersInfo: (state, action) => {
      state.haveUsersInfo = action.payload.haveUsersInfo
    },
    setIsFirstTimeLoading: (state, action) => {
      state.isFirstTimeLoading = action.payload.isFirstTimeLoading
      state.updateTimestamp = action.payload.updateTimestamp
    },
    showModalToAcceptComplexDelete: (state, action) => {
      state.showModalToAcceptComplexDelete = action.payload.showModalToAcceptComplexDelete
      state.complexIdToDelete = action.payload.complexIdToDelete
      if (!state.showModalToAcceptComplexDelete) {
        state.showModalToAcceptComplexDeleteError = "";
      }
    },
    showModalToAcceptComplexDeleteError: (state, action) => {
      state.showModalToAcceptComplexDeleteError = action.payload.showModalToAcceptComplexDeleteError
    },
    setIsSubmitting: (state, action) => {
      state.isSubmitting = action.payload.isSubmitting
    },
    showModalToEditConfiguration: (state, action) => {
      // console.log(`::showModalToEditConfiguration ${JSON.stringify(action)}`)
      state.showModalToEditConfiguration = action.payload.showModalToEditConfiguration
      state.complexIdToEdit = action.payload.complexIdToEdit
    },
    resetToInitialState: (state, action) => {
      state.isFirstTimeLoading = action.payload.isFirstTimeLoading
    },
    showModalToAcceptUserDelete: (state, action) => {
      state.showModalToAcceptUserDelete = action.payload.showModalToAcceptUserDelete
      state.userIdToDelete = action.payload.userIdToDelete
      if (!state.showModalToAcceptUserDelete) {
        state.showModalToAcceptUserDeleteError = "";
      }
    },
    showModalToAcceptUserDeleteError: (state, action) => {
      state.showModalToAcceptUserDeleteError = action.payload.showModalToAcceptUserDeleteError
    },
    showModalToEditUser: (state, action) => {
      state.showModalToEditUser = action.payload.showModalToEditUser
      state.userIdToEdit = action.payload.userIdToEdit
    },
    setNeedToChangePassword: (state, action) => {
      state.needToChangePassword = action.payload.needToChangePassword
    },
    setSelectedComplexes: (state, action) => {
      state.selectedComplexes = action.payload.selected
    },
    setSelectedSensors: (state, action) => {
      state.selectedSensors = action.payload.selected
    },
    setFiltersOpen: (state, action) => {
      state.filtersOpen = action.payload.filtersOpen
    },
    setSensorsDataUpdateInProgress: (state, action) => {
      state.sensorsDataUpdateInProgress = action.payload.sensorsDataUpdateInProgress
    },
    setFiltersDiapazone: (state, action) => {
      state.filtersDiapazone = action.payload.filtersDiapazone
    },
    setHaveSensorsData: (state, action) => {
      state.haveSensorsData = action.payload.haveSensorsData
    },
    setSelectedComplexIndex: (state, action) => {
      state.selectedComplexIndex = action.payload.selectedComplexIndex
    },
    setSelectedUserIndex: (state, action) => {
      state.selectedUserIndex = action.payload.selectedUserIndex
    },
    showDialog: (state, action) => {
      state.dialog = action.payload.dialog
    },
    setSelectedDataType: (state, action) => {
      state.selectedDataType = action.payload.selectedDataType
    },
    showModalToComplexSettings: (state, action) => {
      // console.log(`AppSlice::showModalToComplexSettings(${JSON.stringify(action)})`)
      state.showModalToComplexSettings = action.payload.showModalToComplexSettings
      state.complexIdToSettings = action.payload.complexIdToSettings
      // console.log(`AppSlice::showModalToComplexSettings: state (${JSON.stringify(state)})`)
    },
    setHaveComplexSettingInfo: (state, action) => {
      state.haveComplexSettingInfo = action.payload.haveComplexSettingInfo
    },
    setComplexSettingsInfoRequestInProgress: (state, action) => {
      state.complexSettingsInfoRequestInProgress = action.payload.complexSettingsInfoRequestInProgress
    },
  }
});

export const {
  setLoggedState,
  setComplexesInfo,
  setComplexesConfigInfo,
  setUsersInfo,
  setIsFirstTimeLoading,
  showModalToAcceptComplexDelete,
  setIsSubmitting,
  showModalToEditConfiguration,
  resetToInitialState,
  showModalToAcceptComplexDeleteError,
  showModalToAcceptUserDelete,
  showModalToAcceptUserDeleteError,
  showModalToEditUser,
  setNeedToChangePassword,
  setSelectedComplexes,
  setSelectedSensors,
  setFiltersOpen,
  setSensorsDataUpdateInProgress,
  setFiltersDiapazone,
  setHaveSensorsData,
  setSelectedComplexIndex,
  setSelectedUserIndex,
  showDialog,
  setSelectedDataType,
  showModalToComplexSettings,
  setHaveComplexSettingInfo,
  setComplexSettingsInfoRequestInProgress
} = appSlice.actions;

export default appSlice.reducer;