export { AuthScreen } from './components/AuthScreen.jsx'
export { SignInForm } from './components/SignInForm.jsx'
export { SignUpForm } from './components/SignUpForm.jsx'
export { AuthSessionProvider, useAuthSession } from '../../app/providers/AuthSessionProvider.jsx'
export {
  signInWithPassword,
  registerWithPassword,
  signInWithGoogleProvider,
  signOutCurrentUser,
  getCurrentUser,
  onAuthStateChanged
} from './services/authService.js'

export const authFeatureStatus = 'stage-2-extracted-sidecar'
