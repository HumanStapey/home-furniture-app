import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#173c88' },
    secondary: { main: '#ffd838', contrastText: '#17212b' },
    text: { primary: '#17212b', secondary: '#56616f' },
    background: { default: '#ffffff', paper: '#f2f4f7' },
    divider: '#d7dce3',
  },
  typography: {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    h1: { fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 },
    h2: { fontSize: 21, fontWeight: 650 },
    h3: { fontSize: 24, fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 650 },
  },
  shape: { borderRadius: 5 },
  focusVisible: { outlineWidth: 3, outlineOffset: 4 },
  components: {
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: { root: { minHeight: 48, padding: '12px 22px' } },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
    MuiInputBase: { styleOverrides: { root: { minHeight: 48 } } },
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
