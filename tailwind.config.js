export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      ink: { DEFAULT:'#14303F', 700:'#1C3E50', 600:'#27506A', 300:'#8FA9B8' },
      paper: '#F4F7F6',
      firouzeh: { DEFAULT:'#178C8C', 50:'#E6F4F3', 100:'#C8E8E6', 700:'#0F6666' },
      nil: { DEFAULT:'#2F5D8A', 50:'#EAF0F6' },
      saffron: { DEFAULT:'#D99A1E', 50:'#FBF3E1', 700:'#9C6C0E' },
      anar: { DEFAULT:'#B8432F', 50:'#F8E9E6' },
      line: '#DCE3E1',
      mute: '#62757C',
    },
    fontFamily: { sans: ['Vazir','Tahoma','sans-serif'] },
  } },
  plugins: [],
};
