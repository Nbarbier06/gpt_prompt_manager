const host = window.location.host;
if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
  Sidebar.init();
}

