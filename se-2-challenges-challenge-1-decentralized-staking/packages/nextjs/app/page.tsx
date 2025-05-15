'use client';
import { useState, useEffect } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NFTItem {
  id: number;
  image: string;
  title: string;
  description: string;
  author: string;
  owner: string;
  copyright: string;
 
  attributes: { trait_type: string; value: string }[];
}

const nftItems: NFTItem[] = [
  {
    id: 1,
    image: '/无语佛.jpg',
    title: '《无语佛》',
    description: '“无语佛”原名为“沉思罗汉”，是民国时期陶瓷雕塑大师曾龙升创作的一件陶瓷雕塑。因其面无表情而被网友戏称为“无语菩萨”，现展于景德镇中国陶瓷博物馆，成为文化遗产的代表之一，广受喜爱。🎨✨',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
   
    attributes: [{ trait_type: 'category', value: 'Art' }]
  },
  {
    id: 2,
    image: '/伏虎罗汉.jpg',
    title: '《伏虎罗汉》',
    description: '伏虎罗汉即弥勒尊者，因以善心感化猛虎，使其不再危害生灵，与虎为友，展现出无边慈悲与智慧的力量。🐯🌿',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
  
    attributes: [{ trait_type: 'category', value: 'Cultural Heritage' }]
  },
  {
    id: 3,
    image: '/骑象罗汉.jpg',
    title: '《骑象罗汉》',
    description: '骑象罗汉即迦理迦尊者，象征力量与佛法的威力，驾驭巨象，展现出无比的精神力量与威仪。🐘✨',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
    
    attributes: [{ trait_type: 'category', value: 'Cultural Heritage' }]
  },
  {
    id: 4,
    image: '/笑狮罗汉.jpg',
    title: '《笑狮罗汉》',
    description: '笑狮罗汉即伐阇罗弗多罗尊者，魁梧庄严，身边常伴幼狮，象征着智慧与力量并存的欢喜自在之心。🦁😄',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
   
    attributes: [{ trait_type: 'category', value: 'Cultural Heritage' }]
  },
  {
    id: 5,
    image: '/喜庆罗汉.jpg',
    title: '《喜庆罗汉》',
    description: '喜庆罗汉即迦诺迦代嗟尊者，因闻佛法而喜笑颜开，其欢喜笑容传递着佛法中自由与安乐的精神。🎉😊',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
    
    attributes: [{ trait_type: 'category', value: 'Cultural Heritage' }]
  },
  {
    id: 6,
    image: '/挖耳罗汉.jpg',
    title: '《挖耳罗汉》',
    description: '挖耳罗汉即那迦犀那尊者，善于耳根清净修行，对世间万象之声皆不为所动，象征了内心的宁静与智慧。👂🌸',
    author: '曾龙升',
    owner: '景德镇中国陶瓷博物馆',
    copyright: '版权所有，未经授权禁止转载',
  
    attributes: [{ trait_type: 'category', value: 'Cultural Heritage' }]
  }
];


// 定义可用的分类列表
export const VALID_CATEGORIES = [
  'Art',
  'Music',
  'Trading Cards',
  'Virtual world',
  'Doodles',
  'Sports',
  'Photography',
  'Utility'
] as const;

// 定义一个包含 CSS 变量的类型
interface CustomStyle extends React.CSSProperties {
  '--rotation'?: string;
}

export default function Home() {
  const router = useRouter();
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [items, setItems] = useState(nftItems);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 平滑跟随效果
  useEffect(() => {
    const smoothFollow = () => {
      setCursorPosition(prev => ({
        x: prev.x + (mousePosition.x - prev.x) * 0.1,
        y: prev.y + (mousePosition.y - prev.y) * 0.1
      }));
      requestAnimationFrame(smoothFollow);
    };

    const animationId = requestAnimationFrame(smoothFollow);
    return () => cancelAnimationFrame(animationId);
  }, [mousePosition]);

  const handleNext = () => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const firstItem = newItems.shift();
      if (firstItem) newItems.push(firstItem);
      return newItems;
    });
  };

  const handlePrev = () => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const lastItem = newItems.pop();
      if (lastItem) newItems.unshift(lastItem);
      return newItems;
    });
  };

  // 修改为星星闪烁效果
  useEffect(() => {
    const createStar = () => {
      const container = document.querySelector('.star-container');
      if (!container) return;

      const star = document.createElement('div');
      star.className = 'star-line';
      
      // 随机位置
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // 随机大小
      const size = 1 + Math.random() * 2;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      
      container.appendChild(star);

      // 动画结束后移除元素
      star.addEventListener('animationend', () => {
        star.remove();
      });
    };

    // 每3秒创建一个新的星星
    const interval = setInterval(createStar, 3000);
    
    // 初始创建一些星星
    for(let i = 0; i < 3; i++) {
      setTimeout(() => createStar(), i * 1000);
    }

    return () => clearInterval(interval);
  }, []);

  // 修改 handleCreateNow 函数
  const handleCreateNow = () => {
    router.push('/stakings');
  };

  // 添加购买处理函数
  const handleBuy = () => {
    router.push('/stakings');
  };

  // 添加处理函数
  const handleMyNFTs = () => {
    router.push('/NFTCollection');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#020033] via-[#030045] to-[#020033]">
      {/* 添加额外的渐变装饰层 */}
      <div className="absolute inset-0">
        {/* 左上角渐变 */}
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-[#0a0058]/30 to-transparent"></div>
        
        {/* 右下角渐变 */}
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-radial from-[#0a0058]/30 to-transparent"></div>
        
        {/* 中心光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-[#060050]/50 via-[#040045]/30 to-transparent"></div>
      </div>

      {/* 添加微妙的网格纹理 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,0,81,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,0,81,0.1)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

      {/* 星光效果容器 */}
      <div className="star-container absolute inset-0 pointer-events-none z-10"></div>

      {/* 流星效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="shooting-star"
            style={{
              top: `${Math.random() * 50}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      {/* 跟随光标 */}
      <div 
        className="fixed w-6 h-6 pointer-events-none z-50 mix-blend-screen"
        style={{
          transform: `translate(${cursorPosition.x - 12}px, ${cursorPosition.y - 12}px)`,
          transition: 'transform 0.05s ease-out'
        }}
      >
        <div className="w-full h-full bg-white rounded-full opacity-50 blur-sm"></div>
      </div>

      {/* 科技感背景装饰 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-transparent to-purple-500"></div>
      
      {/* 光晕效果 */}
      <div className="absolute top-20 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full filter blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-purple-500/20 rounded-full filter blur-[100px] animate-pulse"></div>

      {/* 装饰线条 */}
      <div className="absolute left-4 top-1/4 w-40 h-[2px] bg-cyan-500/50"></div>
      <div className="absolute right-4 top-1/3 w-40 h-[2px] bg-purple-500/50"></div>
      <div className="absolute left-8 bottom-1/4 w-20 h-[2px] bg-pink-500/50"></div>

      {/* 科技装饰元素 */}
      <div className="absolute left-6 top-40 w-20 h-20 border-l-2 border-t-2 border-cyan-500/50"></div>
      <div className="absolute right-6 bottom-40 w-20 h-20 border-r-2 border-b-2 border-purple-500/50"></div>

      {/* 右上角装饰元素 */}
      <div className="absolute top-12 right-12 w-[200px] h-[200px] lg:w-[300px] lg:h-[300px] z-10">
        {/* 外圈光环 */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-spin-slower"></div>
        <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-reverse-spin-slower"></div>
        <div className="absolute inset-4 rounded-full border border-pink-500/20 animate-spin-slower"></div>
        
        {/* 内圈装饰 */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-sm group hover:scale-105 transition-transform duration-700">
          <div className="absolute inset-0 rounded-full border border-white/10"></div>
          
          {/* 圆环上的装饰点 */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-500 rounded-full transition-all duration-500 group-hover:scale-150 group-hover:bg-white meteor-point"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 30}deg) translateY(-60px)`,
                '--rotation': `${i * 30}deg`,
                animationDelay: `${i * 0.5}s`
              } as CustomStyle}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-cyan-500 rounded-full meteor-tail"></div>
            </div>
          ))}
        </div>

        {/* 中心图案 */}
        <div className="absolute inset-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-900 to-cyan-900 hover:scale-105 transition-all duration-500">
          <div 
            className="absolute inset-0 animate-pulse-slow bg-cover bg-center opacity-80 hover:opacity-100 transition-opacity duration-300"
            style={{
              backgroundImage: `url('/xongwentao.jpg')`
            }}
          >
          </div>
          {/* 电路图案遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 hover:opacity-0 transition-opacity duration-300"></div>
        </div>
      </div>

      {/* 左侧头像装饰 */}
      <div className="absolute top-8 left-8">
        {/* 头像组 */}
        <div className="flex items-center">
          <div className="flex -space-x-4">
            <div 
              key="1" 
              className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden relative hover:scale-110 transition-transform duration-300 hover:z-10"
            >
              <Image
                src="/piying1.jpg"
                layout="fill"
                objectFit="cover"
                alt="creator 1"
              />
            </div>
            <div 
              key="2" 
              className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden relative hover:scale-110 transition-transform duration-300 hover:z-10"
            >
              <Image
                src="/piying3.jpg"
                layout="fill"
                objectFit="cover"
                alt="creator 2"
              />
            </div>
            <div 
              key="3" 
              className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden relative hover:scale-110 transition-transform duration-300 hover:z-10"
            >
              <Image
                src="/piying2.jpg"
                layout="fill"
                objectFit="cover"
                alt="creator 3"
              />
            </div>
          </div>
          {/* 数字显示 - 调整间距和样式 */}
          <div className="ml-6 flex items-center bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              100K+
            </span>
            <span className="ml-2 text-gray-300">Creators</span>
          </div>
        </div>
      </div>

      {/* 左侧装饰图案 */}
      <div className="absolute left-12 top-40 w-[200px]">
        <div className="relative">
          {[1, 2, 3].map((num, index) => (
            <div
              key={num}
              className="absolute w-[120px] h-[120px] rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm transition-all duration-500 hover:scale-105"
              style={{
                top: `${index * 30}px`,
                left: `${index * 20}px`,
                transform: `rotate(${-index * 5}deg)`,
                zIndex: 3 - index
              }}
            >
              <Image
                src={`/piying${num + 1}.jpg`}
                layout="fill"
                objectFit="cover"
                alt={`nft ${num}`}
                className="hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
          ))}
        </div>
        {/* 装饰箭头 */}
        <div className="absolute -bottom-8 left-[60%] w-20 h-20">
          <div className="w-full h-full border-b-2 border-r-2 border-cyan-500/30 rounded-br-3xl"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500/30 rounded-full"></div>
        </div>
      </div>

      {/* 左侧标题文本 */}
      <div className="absolute left-4 lg:left-12 top-[300px] lg:top-[400px] max-w-lg z-20">
        <h2 className="text-4xl lg:text-7xl font-bold leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-purple-300">
          集藏你的
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          中华稀世
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-400">
          文化瑰宝
          </span>
        </h2>
        <p className="mt-4 lg:mt-6 text-base lg:text-lg text-gray-400 max-w-md leading-relaxed">
        以文化遗产为灵感的数字文创平台。在这里,铸造、收藏、交易、共赏千载文化之美。
        </p>
        <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row gap-4 sm:space-x-4 relative">
          <button 
            className="px-6 lg:px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer z-30"
            onClick={handleMyNFTs}
          >
           我的文创 
          </button>
          <button 
            onClick={handleCreateNow}
            className="px-6 lg:px-8 py-3 border border-purple-500/30 rounded-full text-white hover:bg-purple-500/10 transition-all duration-300 cursor-pointer z-30"
          >
           立即铸创
          </button>
        </div>
      </div>

      {/* 主要内容容器 */}
      <div className="container mx-auto px-4 py-16 relative">
        {/* 原有的标题和轮播内容保持不变 */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            链上博物馆—基于区块链的文创藏品与3D社交文化馆
            </h1>
            {/* 标题装饰 */}
            <div className="absolute -top-2 -left-4 w-2 h-2 bg-cyan-500"></div>
            <div className="absolute -top-2 -right-4 w-2 h-2 bg-purple-500"></div>
            <div className="absolute -bottom-2 left-1/2 w-40 h-1 -translate-x-1/2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
          </div>
          <p className="text-gray-300 text-lg">探索独特的非遗文创世界</p>
        </div>

        {/* 轮播容器 - 添加装饰边框 */}
        <div className="relative w-full max-w-[1100px] h-[400px] md:h-[500px] lg:h-[700px] mx-auto">
          {/* 装饰边角 */}
          <div className="absolute -top-2 -left-2 w-20 h-20 border-l-2 border-t-2 border-cyan-500/50"></div>
          <div className="absolute -top-2 -right-2 w-20 h-20 border-r-2 border-t-2 border-purple-500/50"></div>
          <div className="absolute -bottom-2 -left-2 w-20 h-20 border-l-2 border-b-2 border-pink-500/50"></div>
          <div className="absolute -bottom-2 -right-2 w-20 h-20 border-r-2 border-b-2 border-purple-500/50"></div>

          {/* 原有的轮播内容保持不变 */}
          <div className="slide relative w-full h-full">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`item absolute transition-all duration-500 cursor-pointer
                  ${index === 0 || index === 1 ? 'w-full h-full top-0 left-0' : 
                    index === 2 ? 'w-[150px] md:w-[200px] h-[200px] md:h-[300px] left-[50%]' :
                    index === 3 ? 'w-[150px] md:w-[200px] h-[200px] md:h-[300px] left-[calc(50%+170px)] md:left-[calc(50%+220px)]' :
                    index === 4 ? 'w-[150px] md:w-[200px] h-[200px] md:h-[300px] left-[calc(50%+340px)] md:left-[calc(50%+440px)]' :
                    'w-[150px] md:w-[200px] h-[200px] md:h-[300px] left-[calc(50%+510px)] md:left-[calc(50%+660px)] opacity-0'
                  }`}
                style={{
                  marginTop: index <= 1 ? '0' : '-100px md:-150px',
                  top: index <= 1 ? '0' : '50%'
                }}
                onClick={() => index <= 1 && setSelectedNFT(item)}
              >
                <Image
                  src={item.image}
                  layout="fill"
                  objectFit="cover"
                  alt={item.title}
                  className="rounded-[4px]"
                />
                {index === 1 && (
                  <div className="content absolute w-[200px] md:w-[300px] left-[50px] md:left-[100px] top-1/2 -translate-y-1/2 text-white">
                    <div className="name text-2xl md:text-[40px] font-[900] animate-fadeIn">
                      {item.title}
                    </div>
                    <div className="des my-3 md:my-5 text-sm md:text-base animate-fadeIn animation-delay-300">
                      {item.description}
                    </div>
                    <button className="px-4 md:px-5 py-2 md:py-2.5 bg-white/20 rounded animate-fadeIn animation-delay-600">
                      查看详情
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 控制按钮 - 美化样式 */}
          <div className="btns absolute bottom-[50px] w-full flex justify-center">
            <div 
              className="s-btn left w-[50px] h-[50px] mx-[25px] bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-full cursor-pointer flex items-center justify-center text-[25px] font-[900] text-white border border-cyan-500/30 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
              onClick={handlePrev}
            >
              &lt;
            </div>
            <div 
              className="s-btn right w-[50px] h-[50px] mx-[25px] bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-full cursor-pointer flex items-center justify-center text-[25px] font-[900] text-white border border-cyan-500/30 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
              onClick={handleNext}
            >
              &gt;
            </div>
          </div>
        </div>

        {/* NFT 详情弹窗 */}
        {selectedNFT && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay">
            <div className="bg-gradient-to-br from-[#040047] via-[#050056] to-[#040047] rounded-2xl p-4 md:p-8 max-w-4xl w-full mx-4 border border-[#0a0058] relative">
              {/* 关闭按钮 */}
              <button 
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                onClick={() => setSelectedNFT(null)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* NFT 内容 */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                {/* 左侧图片 */}
                <div className="w-full md:w-1/2 relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src={selectedNFT.image}
                    layout="fill"
                    objectFit="cover"
                    alt={selectedNFT.title}
                    className="hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* 右侧信息 */}
                <div className="w-full md:w-1/2 flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    {selectedNFT.title}
                  </h2>
                  
                  {/* 添加价格显示 */}
                  <div className="flex items-center space-x-2 mb-4 md:mb-6">
                  
                 
                  </div>
                  
                  <div className="space-y-4 text-gray-300">
                    <p className="leading-relaxed">
                      {selectedNFT.description}
                    </p>
                    
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">作者</span>
                        <span>{selectedNFT.author}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">所有者</span>
                        <span>{selectedNFT.owner}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                   
                        <div className="flex items-center space-x-2">
                         
                          
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">版权信息</span>
                        <span className="text-sm">{selectedNFT.copyright}</span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 md:gap-4 mt-4 md:mt-8">
                      <button 
                        onClick={handleBuy}
                        className="flex-1 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm md:text-base"
                      >
                        去往文艺市集
                      </button>
                      
                      <button 
                        className="flex-1 px-4 md:px-6 py-2 md:py-3 border border-purple-500/30 rounded-full text-white hover:bg-purple-500/10 transition-all duration-300 text-sm md:text-base"
                      >
                        收藏
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 添加隐藏的图片链接字段 */}
      <input
        type="hidden"
        name="image"
        value={selectedNFT?.image || ""}
      />
    </div>
  );
}
