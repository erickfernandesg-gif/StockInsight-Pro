'use client';

import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewsSection() {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Mágica: Converte o RSS do InfoMoney em JSON para o nosso Dashboard ler
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.infomoney.com.br/mercados/feed/');
        const data = await res.json();
        
        if (data.status === 'ok') {
          setNews(data.items.slice(0, 5)); // Pega as 5 últimas manchetes
        } else {
          throw new Error("Falha ao carregar RSS");
        }
      } catch (error) {
        console.error("Erro ao buscar notícias:", error);
        // Fallback de emergência caso a internet oscile
        setNews([
          {
            title: "Ibovespa opera com volatilidade aguardando falas do Banco Central",
            pubDate: new Date().toISOString(),
            link: "#",
            categories: ["Mercados"]
          },
          {
            title: "Dólar reage ao fluxo estrangeiro e dados de inflação americanos",
            pubDate: new Date(Date.now() - 3600000).toISOString(),
            link: "#",
            categories: ["Câmbio"]
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Formata o tempo para "Há 2 horas", "Há 15 min" etc...
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    return `Há ${Math.floor(diffInHours / 24)} dias`;
  };

  return (
    <div className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="p-6 border-b border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Newspaper className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Latest <span className="text-primary">News</span></h2>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-background-dark px-3 py-1 rounded-full border border-border-dark hidden sm:block">
          Live InfoMoney Feed
        </span>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-3 sm:gap-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Sincronizando Feed...</span>
          </div>
        ) : (
          news.map((item, index) => (
            <motion.a 
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group block p-4 rounded-xl border border-border-dark bg-background-dark/30 hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <h3 className="text-sm font-bold text-slate-300 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.pubDate)}
                    </span>
                    {item.categories && item.categories.length > 0 && (
                      <span className="flex items-center gap-1 opacity-70">
                        <TrendingUp className="w-3 h-3" />
                        {item.categories[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-surface-dark text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0 hidden xs:block">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </motion.a>
          ))
        )}
      </div>
    </div>
  );
}