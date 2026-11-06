'use strict';

// SERVER-ONLY CONFIGURATION.
// This file must remain beside server.js and must NEVER be placed in /public.
// Add your Supabase secret key below. Do not use the publishable key here.

module.exports = {
  discord: {
    clientId: '',
    clientSecret: '',
    redirectUri: 'https://YOUR-SERVICE.onrender.com/auth/discord/callback',
    sessionSecret: 'e993c6d2e7996326c43605a48959f950ad392f9459fd78fae6f45dc68fa18e9bcdfd0eebf08aa97c83b915897508f89c',
    botToken: '',
    guildId: '',
    managementDiscordIds: [
      '989965219579166780'
      '634491499576557596'
    ]
  },
  supabase: {
    url: 'https://aevjkzbfjjctfxcfjsjv.supabase.co',
    secretKey: 'sb_secret__2L86gMoF09OYWXpNhZVAQ_g9XSmgDk'
  }
};
