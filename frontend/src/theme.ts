import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1647ba', contrastText: '#ffffff' },
    secondary: { main: '#ffe04a', contrastText: '#17253a' },
    text: { primary: '#17253a', secondary: '#586578' },
    background: { default: '#ffffff', paper: '#f3f6fa' },
    divider: '#dce2eb',
  },
  typography: {
    fontFamily: "var(--font-manrope), 'Segoe UI', sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontSize: 24, fontWeight: 750 },
    h3: { fontSize: 24, fontWeight: 750 },
    button: { textTransform: 'none', fontWeight: 750 },
  },
  shape: { borderRadius: 12 },
  focusVisible: { outlineWidth: 3, outlineOffset: 4 },
  components: {
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: { root: { minHeight: 48, padding: '12px 24px', borderRadius: 999 } },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
    MuiInputBase: { styleOverrides: {
      root: { minHeight: 52 },
      input: ({ theme }) => ({ '&::placeholder': { color: theme.palette.text.secondary, opacity: 1 } }),
    } },
    MuiOutlinedInput: { styleOverrides: {
      root: { borderRadius: 8, backgroundColor: '#ffffff' },
      notchedOutline: ({ theme }) => ({ borderColor: theme.palette.text.secondary }),
    } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.default, overflow: 'visible' }) },
    },
    MuiRating: {
      styleOverrides: { iconFilled: ({ theme }) => ({ color: theme.palette.primary.main }) },
    },
    MuiCssBaseline: {
      styleOverrides: theme => ({
        ':root': {
          '--ink': theme.palette.text.primary,
          '--muted': theme.palette.text.secondary,
          '--blue': theme.palette.primary.main,
          '--on-blue': theme.palette.primary.contrastText,
          '--yellow': theme.palette.secondary.main,
          '--surface': theme.palette.background.paper,
          '--background': theme.palette.background.default,
          '--line': theme.palette.divider,
          fontSynthesis: 'none',
        },
        'h1, h2, h3, p': { margin: 0 },
        a: { color: theme.palette.primary.main },
        'button, input, select, a': { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' },
        ':focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 4 },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { animation: 'none !important', transition: 'none !important' },
        },
      }),
    },
  },
});
