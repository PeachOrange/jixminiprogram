(function () {
  const model = globalThis.MiniProgramModel;
  const content = document.getElementById('page-content');
  const header = document.getElementById('app-header');
  const roleSelect = document.getElementById('role-select');
  const levelSelect = document.getElementById('level-select');
  const statusSelect = document.getElementById('status-select');
  const contentStateSelect = document.getElementById('content-state-select');
  const scenarioPanel = document.getElementById('scenario-controls');
  const scenarioToggle = document.getElementById('scenario-toggle');
  const modal = document.getElementById('upgrade-modal');
  const phoneAuthorizationPanel = document.getElementById('phone-authorization-panel');
  const toast = document.getElementById('toast');
  const upgradeButton = document.getElementById('show-upgrade');

  const state = {
    role: 'owner', level: 4, status: '正常', page: 'mine', root: 'mine', history: [],
    timeScope: '本月', incomeFilter: '全部', orderFilter: '全部', teamFilter: '全部', materialTab: '发圈工具',
    selectedContent: null, registration: null, registrationResult: 'created', contentScenario: 'normal',
    cityPickerProvince: '上海市', cityPickerCity: '上海市',
    phoneAuthorized: false,
  };

  const cityCatalog = {
    上海市: ['上海市'],
    浙江省: ['杭州市', '宁波市', '温州市'],
    江苏省: ['南京市', '苏州市', '无锡市'],
    广东省: ['广州市', '深圳市', '佛山市'],
  };

  const conditions = [
    { name: '店铺客户', current: 18, target: 20, enabled: true },
    { name: '店铺收益', current: 8800, target: 10000, enabled: true, money: true },
    { name: '团队店主', current: 9, target: 20, enabled: true },
  ];

  const incomeRows = [
    { type: '回收收入', title: '本人闲置回收到账', detail: '旧衣鞋包 · 已入账', value: '+128.60', icon: '回' },
    { type: '自营业务收益', title: '自营业务收益', detail: '订单 XJ08060218 · 已结算', calculation: '计收益基数 ¥500 × 15% = ¥75', rule: '轻享店主·LV4 · 规则版本 V1.2', value: '+75.00', icon: '营' },
    { type: '直属客户收益', title: '直属客户收益', detail: '客户尾号 6815 · 已结算', calculation: '计收益基数 ¥420 × 10% = ¥42', rule: '轻享店主·LV4 · 规则版本 V1.2', value: '+42.00', icon: '客' },
    { type: '团队收益', title: '一级团队收益', detail: '团队订单 · 已结算', calculation: '计收益基数 ¥600 × 6% = ¥36', rule: '轻享店主·LV4 · 规则版本 V1.2', value: '+36.00', icon: '团' },
    { type: '拉新收益', title: '新客户首单奖励', detail: '观察期剩2天 · 不计入升级', value: '待解锁', icon: '新', pending: true },
  ];

  const teamOrders = [
    { id: 'XJ08070018', status: '待取件', owner: '直属客户 · 林女士', category: '旧衣鞋包', updated: '今天 09:26', estimatedIncome: 12.8 },
    { id: 'XJ08070012', status: '待取件', owner: '一级团队 · 周先生', category: '鞋服', updated: '今天 08:40', estimatedIncome: 8.6 },
    { id: 'XJ08060196', status: '待收货', owner: '直属客户 · 陈先生', category: '手机', updated: '昨天 18:15', estimatedIncome: 56 },
    { id: 'XJ08060173', status: '待质检', owner: '一级团队 · 吴女士', category: '鞋服', updated: '昨天 14:02', estimatedIncome: 10.5 },
    { id: 'XJ08050108', status: '待确认', owner: '本人经营', category: '图书', updated: '08-05 11:35', estimatedIncome: 6.2 },
  ];

  const teamDataMembers = [
    { name: '周先生', kind: '一级团队', meta: '轻享店主·LV3 · 正常经营', value: '12笔' },
    { name: '吴女士', kind: '一级团队', meta: '成长店主·LV2 · 正常经营', value: '5笔' },
    { name: '赵店主', kind: '二级团队', meta: '成长店主·LV6 · 信息已脱敏', value: '8笔' },
    { name: '孙店主', kind: '二级团队', meta: '进阶店主·LV8 · 信息已脱敏', value: '6笔' },
    { name: '钱店主', kind: '二级团队', meta: '轻享店主·LV4 · 信息已脱敏', value: '4笔' },
  ];

  const teamMembers = [
    { name: '周先生', kind: '直属店主', meta: '轻享店主·LV3 · 正常经营', value: '12笔' },
    { name: '吴女士', kind: '直属店主', meta: '成长店主·LV2 · 正常经营', value: '5笔' },
    { name: '林女士', kind: '直属客户', meta: '绑定于2026-06-18 · 已有效成交', value: '3笔' },
    { name: '陈先生', kind: '直属客户', meta: '手机号尾号 6815 · 已有效成交', value: '2笔' },
    { name: '赵店主', kind: '二级店主', meta: '仅LV11—LV12可见 · 信息已脱敏', value: '8笔' },
  ];

  const trainingContent = {
    发圈工具: [
      { category: '日常回收', title: '换季清理正品旧鞋，高价回收不浪费', meta: '文案＋3张配图 · 今日更新', tone: 'shoes', action: '复制文案' },
      { category: '社区地推', title: '社区回收日，一键预约上门取件', meta: '文案＋2张配图 · 高转化', tone: 'community', action: '保存素材' },
    ],
    视频素材: [
      { category: '项目介绍', title: '一分钟讲清回收店主经营模式', meta: '00:58 · 竖版视频', tone: 'video-a', action: '播放视频' },
      { category: '实拍案例', title: '回收现场：如何快速完成估价', meta: '01:26 · 横版视频', tone: 'video-b', action: '保存素材' },
    ],
    学习资料: [
      { category: '新手必读', title: '回收店主经营入门手册', meta: '12分钟 · 已解锁', tone: 'guide', action: '阅读全文' },
      { category: '鉴定知识', title: '常见鞋服成色判断图解', meta: '8分钟 · LV5解锁', tone: 'identify', action: '查看解锁条件', locked: true },
    ],
  };

  const titles = {
    mine: '我的', register: '开通我的回收店', 'register-success': '登记成功', store: '我的回收店',
    growth: '成长与权益', wallet: '我的钱包', 'team-orders': '店铺进行中订单', team: '客户与团队',
    share: '分享店铺', landing: '分享落地页', training: '专属素材', content: '内容详情',
    rules: '经营规则', status: '状态详情', advisor: '专属顾问', operations: '经营数据',
  };

  function money(value) {
    return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function escapeAttribute(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function statusTone(status) {
    return ['冻结', '终止', '已退出'].includes(status) ? 'danger' : status === '正常' ? '' : 'warning';
  }

  function progressValue() {
    return model.calculateProgress(conditions, 'all');
  }

  function renderHeader() {
    const isMine = state.page === 'mine';
    header.innerHTML = `${isMine ? '<span class="header-ghost">10:24</span>' : '<button class="header-back" type="button" data-go-back aria-label="返回"></button>'}<strong class="app-title">${titles[state.page] || '极X星球'}</strong><span class="header-ghost">${isMine ? '设置' : '•••'}</span>`;
  }

  function renderProfile(identity) {
    const progress = progressValue();
    return `<section class="profile-hero">
      <div class="profile-row"><div class="avatar">陈</div><div class="profile-main"><h2>陈先生</h2>
      <p><span class="identity-label">${identity.identity}·LV${identity.level}</span><small>店铺编号 JX-0805168</small></p>
      <button class="profile-growth" type="button" data-page="growth"><span>${identity.level === 12 ? '合伙人权益已全部生效' : `距 LV${identity.level + 1} 还差 11 位团队店主`}</span><div class="profile-progress"><i style="width:${identity.level === 12 ? 100 : progress}%"></i></div><b>${identity.level === 12 ? 100 : progress}% →</b></button></div></div>
    </section>`;
  }

  function renderOrdinaryProfile() {
    const userId = '2039230691077779458';
    return `<section class="profile-card ordinary-profile-card"><div class="profile-row"><div class="avatar">陈</div><div class="profile-main"><h2>陈先生</h2><p>普通用户·LV1</p><div class="ordinary-profile-id"><span>ID：${userId}</span><button type="button" data-copy-user-id="${userId}" aria-label="复制用户ID">复制</button></div></div></div></section>`;
  }

  function renderMineServicePanels() {
    return `<section class="mine-service-panels" aria-label="回收服务">
      <div class="mine-service-pair">
        <button class="mine-service-card" type="button" data-toast="已打开我的评估"><i>估</i><strong>我的评估</strong><em>17</em></button>
        <button class="mine-service-card" type="button" data-root="orders"><i>单</i><strong>我的订单</strong><em>7</em></button>
      </div>
      <button class="mine-assessor-card" type="button" data-toast="已进入评估师服务"><span><i>师</i><strong>评估师</strong><em>57</em></span><b>去评估 ›</b></button>
    </section>`;
  }

  function renderMineWallet() {
    const wallet = model.getWalletSummary();
    return `<button class="mine-wallet-card" type="button" data-page="wallet" aria-label="查看我的钱包"><div class="mine-wallet-head"><h3>我的钱包</h3><span>查看明细 ›</span></div><div class="mine-wallet-metrics"><span>账户余额（元）<b>${wallet.withdrawable.toFixed(2)}</b></span><span><em>使用加价券</em>加价券<b>14</b></span></div></button>`;
  }

  function renderCommonFeatures() {
    return `<section class="section-card mine-common-features"><div class="section-card-head"><h3>常用功能</h3></div><div class="common-feature-grid">
      <button type="button" data-toast="已打开地址管理"><i>址</i><span>地址管理</span></button>
      <button type="button" data-toast="已打开收款信息"><i>卡</i><span>收款信息</span></button>
      <button type="button" data-toast="正在联系平台客服"><i>客</i><span>联系客服</span></button>
      <button type="button" data-toast="分享链接已生成"><i>享</i><span>分享得奖励</span></button>
      <button type="button" data-toast="已打开个人信息"><i>改</i><span>修改信息</span></button>
      <button type="button" data-root="home"><i>鉴</i><span>鉴定中心</span></button>
      <button type="button" data-toast="已打开平台合作说明"><i>合</i><span>合作</span></button>
    </div></section>`;
  }

  function renderOrdinaryStoreEntry() {
    if (state.registration) {
      return `<button class="store-entry-card mine-store-hero opening" type="button" data-page="register"><span class="store-entry-mark">店</span><span><small>开店登记</small><strong>查看开店登记</strong><em>已提交登记，可查看并更新运营联系资料</em></span><b>更新登记资料 →</b></button>`;
    }
    return `<button class="store-entry-card mine-store-hero opening" type="button" data-page="register"><span class="store-entry-mark">店</span><span><small>回收店服务</small><strong>开通我的回收店</strong><em>登记成为回收店主，解锁经营、成长与分享能力</em></span><b>立即登记开店 →</b></button>`;
  }

  function renderMine() {
    const identity = model.getIdentityView(state);
    const profile = identity.showStoreArea ? renderProfile(identity) : renderOrdinaryProfile();
    const storeEntry = identity.showStoreArea
      ? '<button class="store-entry-card mine-store-hero" type="button" data-page="store"><span class="store-entry-mark">店</span><span><small>认证回收店</small><strong>陈先生回收店</strong><em>本月 14 笔有效订单 · 新增 8 位客户</em></span><b>进入我的回收店 →</b></button>'
      : renderOrdinaryStoreEntry();
    return `${profile}${storeEntry}
      ${renderMineServicePanels()}
      ${renderMineWallet()}
      ${renderCommonFeatures()}`;
  }

  function renderRegister() {
    const registration = state.registration || {
      realName: '陈先生', phone: '13800006815', wechat: '', city: '上海市', storeName: '陈先生的回收店',
    };
    return `<section class="register-intro"><span class="section-label">最小登记</span><h2>开通我的回收店</h2><p>提交后由运营老师与你联系，不会提前创建店主身份或发放权益。</p></section>
      <form class="registration-form" id="registration-form">
        <label><span>名称</span><input name="realName" value="${escapeAttribute(registration.realName)}" autocomplete="name" required></label>
        <label><span>手机号</span><input name="phone" value="${escapeAttribute(registration.phone)}" inputmode="tel" autocomplete="tel" data-phone-authorization required></label>
        <label><span>微信号 <small>选填</small></span><input name="wechat" value="${escapeAttribute(registration.wechat)}" placeholder="用于运营老师联系"></label>
        <label><span>所在城市</span><button class="city-picker-trigger" type="button" data-city-picker><span>${registration.city || '请选择省市'}</span><i>›</i></button><input type="hidden" name="city" value="${escapeAttribute(registration.city)}"></label>
        <div class="agreement-row"><label class="agreement"><input type="checkbox" name="agreement" required ${state.registration ? 'checked' : ''}><span>我已阅读并同意</span></label><button class="agreement-link" type="button" data-cooperation-rules>《店主合作规范》</button></div>
        <button class="submit-button" type="submit">${state.registration ? '更新登记资料' : '提交登记'}</button>
      </form><p class="form-footnote">不收集身份证照片、银行卡、粉丝数量、经营计划或邀请码。</p>`;
  }

  function renderRegisterSuccess() {
    const updated = state.registrationResult === 'updated';
    return `<section class="success-state"><span class="success-icon">✓</span><span class="section-label">${updated ? '资料更新成功' : '登记已提交'}</span><h2>${updated ? '登记资料已更新' : '运营老师将尽快联系你'}</h2><p>${updated ? '运营老师将使用最新资料与你联系。开通前，你仍保持普通用户身份。' : '登记不会展示审核进度。开通前，你仍保持普通用户身份。'}</p>
      <div class="qr-card"><div class="qr-code" aria-label="运营老师微信码">极X<br>运营</div><div><strong>运营老师微信码</strong><small>扫码添加运营老师，了解开店准备事项</small></div></div>
      <button class="primary-inline" type="button" data-toast="已保存运营老师微信码">保存微信码</button><button class="secondary-inline" type="button" data-page="mine">返回我的</button></section>`;
  }

  function renderStore() {
    const wallet = model.getWalletSummary();
    const summary = model.summarizeOrders(teamOrders);
    const scopeFactor = state.timeScope === '本月' ? 1 : state.timeScope === '上月' ? 0.78 : 5.6;
    return `<section class="store-hero"><div class="store-title"><div><span class="verified-badge">平台认证店主</span><h2>陈先生回收店</h2><p>${model.getIdentityView(state).identity}·LV${state.level} · ${state.status} · 数据更新于10:20</p></div><button type="button" data-page="share">分享店铺</button></div>
      <div class="scope-tabs">${['本月', '上月', '累计'].map((tab) => `<button type="button" class="${state.timeScope === tab ? 'active' : ''}" data-time-scope="${tab}">${tab}</button>`).join('')}</div>
      <div class="store-income"><span>${state.timeScope}已结算店铺收益</span><strong>${money(wallet.monthStoreIncome * scopeFactor)}</strong><small>实际结算数据，不含回收收入</small></div></section>
      <section class="store-metric-panel"><div class="store-metric-heading"><span>收益状态</span><small>当前金额</small></div><div class="metric-finance-grid"><article><span>待结算店铺收益<small class="current-metric-badge">当前</small></span><strong>${money(wallet.pendingBusiness)}</strong><p>已产生，等待平台完成结算</p></article><article class="locked-income"><span>待解锁拉新收益<small class="current-metric-badge">当前</small><button class="metric-help-button" type="button" data-locked-income-help aria-label="查看拉新收益说明">!</button></span><strong>${money(wallet.lockedAcquisition)}</strong><p>达到拉新收益解锁条件后释放</p></article></div><div class="store-metric-heading operation"><span>${state.timeScope}经营数据</span><small>随时间筛选切换</small></div><div class="metric-operation-grid"><article><span>店铺订单</span><strong>${Math.round(14 * scopeFactor)}笔</strong></article><article><span>新增店铺客户</span><strong>${Math.round(8 * scopeFactor)}人</strong></article></div></section>
      <button class="order-summary-card" type="button" data-page="team-orders"><span><small>店铺进行中订单</small><strong>${summary.total} 笔</strong></span><div>${['待取件', '待收货', '待质检', '待确认'].map((key) => `<em>${key}<b>${summary[key]}</b></em>`).join('')}</div><i>查看全部 →</i></button>
      <section class="section-card"><div class="section-card-head"><h3>经营工具</h3></div><div class="agent-grid store-tools"><button type="button" data-page="team"><i>团</i><span>客户与团队</span></button><button type="button" data-page="growth"><i>级</i><span>成长与权益</span></button><button type="button" data-page="wallet"><i>收</i><span>收益明细</span></button><button type="button" data-page="share"><i>享</i><span>分享店铺</span></button><button type="button" data-page="training"><i>材</i><span>专属素材</span></button><button type="button" data-page="rules"><i>规</i><span>规则说明</span></button></div></section>
      <button class="store-advisor-entry" type="button" data-page="advisor"><span class="advisor-avatar">顾</span><span><small>专属运营服务</small><strong>陈老师 · 店主运营顾问</strong><em>开店、经营与等级问题都可以联系我</em></span><b>查看微信码 →</b></button>`;
  }

  function renderGrowth() {
    const cards = model.getLevelCards(state.level);
    const roadmap = model.getLevelRoadmap(state.level);
    const conditionProgress = conditions.map((item) => {
      const ratio = Math.min(100, Math.round((item.current / item.target) * 100));
      const value = `${item.money ? money(item.current) : item.current} / ${item.money ? money(item.target) : item.target}`;
      return `<div class="condition-row ${ratio === progressValue() ? 'bottleneck' : ''}"><div class="condition-meta"><span>${item.name}</span><b>${value} · ${ratio}%</b></div><div class="progress-track"><i style="width:${ratio}%"></i></div></div>`;
    }).join('');
    const cardMarkup = cards.map((card, index) => {
      const action = index === 0 ? `data-benefit-help="${card.level}"` : `data-upgrade-conditions="${card.level}"`;
      return `<article class="benefit-card ${index === 0 ? 'current' : index === 1 ? 'next' : ''}" data-level-card="${index}"><div class="benefit-card-top"><div><span>${index === 0 ? '当前等级' : index === 1 ? '下一级' : '后续等级'}</span><h2>LV${card.level}</h2><p>${card.identity}</p></div><b>${index === 0 ? '已生效' : index === 1 ? '升级目标' : '继续成长'}</b></div><div class="benefit-list">${card.benefits.map((benefit) => `<div class="benefit-item ${benefit.isNew ? 'new' : ''}"><i>✓</i><span>${benefit.name}</span>${benefit.isNew ? '<em>新增</em>' : ''}</div>`).join('')}</div><button type="button" ${action}>${index === 0 ? '查看权益使用说明' : `查看LV${card.level}升级条件`}</button></article>`;
    }).join('');
    const moreCard = roadmap.length ? `<article class="benefit-card more-benefits-card" data-level-card="${cards.length}"><div class="more-benefits-top"><span>更多等级</span><b>待解锁</b></div><div class="more-benefits-copy"><i class="more-benefits-lock" aria-hidden="true"></i><h2>升级解锁更多权益</h2><p>继续成长，逐步解锁 LV${roadmap[0].level}–LV${roadmap[roadmap.length - 1].level} 经营能力。</p></div><div class="more-benefits-preview"><span>更多经营品类</span><span>高阶团队能力</span><span>专属运营支持</span></div></article>` : '';
    return `<section class="growth-progress-panel"><div class="growth-progress-head"><div><span>成长总览</span><h2>${model.getIdentityView(state).identity}·LV${state.level}</h2></div><strong>综合进度 ${progressValue()}%</strong></div><p>升级条件需全部满足，橙色为当前最慢指标。</p><div class="condition-list">${conditionProgress}</div></section>
      <div class="level-section-head"><div><span class="section-label">等级权益</span><h3>横向滑动查看下一级全部权益</h3></div><div class="level-dots">${cards.map((card, index) => `<button class="${index === 0 ? 'active' : ''}" type="button" data-level-dot="${index}" aria-label="查看LV${card.level}" ${index === 0 ? 'aria-current="true"' : ''}></button>`).join('')}${roadmap.length ? `<button class="locked" type="button" data-level-dot="${cards.length}" aria-label="查看更多等级权益"></button>` : ''}</div></div>
      <section class="level-carousel">${cardMarkup}${moreCard}</section>`;
  }

  function renderWallet() {
    return '<section class="wallet-reuse-note"><p>复用“我的钱包”页面</p></section>';
  }

  function renderTeamOrders() {
    const summary = model.summarizeOrders(teamOrders);
    const rows = state.orderFilter === '全部' ? teamOrders : teamOrders.filter((row) => row.status === state.orderFilter);
    return `<section class="order-page-summary"><span>授权范围内进行中订单</span><strong>${summary.total}笔</strong><p>仅展示经营所需的脱敏信息，不展示完整手机号、地址和质检隐私资料。</p></section>
      <div class="filter-tabs">${['全部', '待取件', '待收货', '待质检', '待确认'].map((type) => `<button class="${state.orderFilter === type ? 'active' : ''}" type="button" data-order-filter="${type}">${type}${type === '全部' ? summary.total : summary[type]}</button>`).join('')}</div>
      <section class="order-list">${rows.map((row) => `<article><div><span class="status-chip">${row.status}</span><strong>${row.category}</strong><small>${row.owner}</small><em class="order-estimated-income"><small>预估收益</small><strong>${money(row.estimatedIncome)}</strong></em></div><p><b>${row.id}</b><span>${row.updated}</span></p></article>`).join('')}</section>`;
  }

  function renderTeam() {
    const visibility = model.getTeamVisibility(state.level);
    const allowed = teamMembers.filter((member) => visibility.depth === 2 || member.kind !== '二级店主');
    const rows = state.teamFilter === '团队数据' ? teamDataMembers : model.filterTeamMembers(allowed, state.teamFilter);
    const tabs = visibility.depth === 2 ? ['全部', '直属店主', '直属客户', '二级店主', '团队数据'] : ['全部', '直属店主', '直属客户'];
    const teamOverviewClass = visibility.depth === 2 ? 'team-overview extended' : 'team-overview';
    const listContent = `<section class="section-card">${rows.map((member) => {
      const canPromoteCustomer = state.level >= 11 && member.kind === '直属客户';
      return `<article class="person-row"><span class="person-avatar">${member.name[0]}</span><span class="person-copy"><strong>${member.name}<em class="member-kind">${member.kind}</em></strong><span>${member.meta}</span></span><span class="person-row-actions"><b>${member.value}</b>${canPromoteCustomer ? `<button class="promote-owner-button" type="button" data-toast="${member.name}已发起店主升级">升级为店主</button>` : ''}</span></article>`;
    }).join('')}</section>`;
    return `<section class="team-contribution"><div><div><span>下一级升级贡献</span><strong>团队店主 9 / 20</strong></div><b>45%</b></div><div class="progress-track"><i style="width:45%"></i></div><p>团队店主是当前最慢指标，还差 11 位直属店主达到升级条件。</p></section>
      <section class="${teamOverviewClass}"><div><span>有效订单</span><strong>14</strong><small>本月授权范围</small></div><div><span>直属客户</span><b>26</b><small>已完成绑定</small></div><div><span>直属店主</span><b>8</b><small>${visibility.depth}级可见范围</small></div>${visibility.depth === 2 ? '<div><span>团队数量</span><b>42</b><small>一级＋二级店主</small></div>' : ''}</section>
      <div class="filter-tabs team-tabs">${tabs.map((type) => `<button class="${state.teamFilter === type ? 'active' : ''}" type="button" data-team-filter="${type}">${type}</button>`).join('')}</div>
      ${listContent}<p class="privacy-note">可见范围扩大不代表新增收益层级，不改变现有客户绑定关系。</p>`;
  }

  function renderShare() {
    const destination = model.getShareDestination(state.status);
    return `<section class="share-hero"><span class="section-label">店铺专属海报</span><h2>把自己的回收店分享出去</h2><p>海报与链接携带稳定的店铺标识，已绑定客户不会因点击其他店铺链接而改绑。</p></section>
      <section class="poster-card"><div class="poster-brand">极X星球</div><span class="verified-badge">平台认证回收店</span><h2>陈先生回收店</h2><p>旧衣鞋包 · 手机数码 · 图书<br>平台回收、质检、结算全程保障</p><div class="poster-owner"><div class="avatar">陈</div><span><b>陈店主</b><small>轻享店主·LV${state.level}</small></span></div><div class="poster-qr">专属<br>二维码</div><small>扫码发起回收，进入平台统一回收流程</small></section>
      <section class="share-actions"><button type="button" data-toast="店铺专属海报已保存">保存海报</button><button type="button" data-toast="店铺专属链接已复制">复制专属链接</button><button type="button" data-page="landing">预览分享落地页</button></section>
      <section class="link-status ${destination.mode === 'platform' ? 'danger' : ''}"><strong>当前链接状态：${destination.mode === 'store' ? '店铺专属页' : '平台通用页'}</strong><p>${destination.message}；${destination.allowAttribution ? '允许按既有规则新增归因。' : '不产生新绑定或新店铺收益。'}</p></section>`;
  }

  function renderLanding() {
    const destination = model.getShareDestination(state.status);
    if (destination.mode === 'platform') return `<section class="landing-generic"><span>极X星球回收</span><h2>让闲置重新产生价值</h2><p>原店铺链接当前不可用，已为你安全切换到平台通用回收服务。</p><button type="button" data-root="home">立即开始回收</button></section>`;
    return `<section class="landing-store"><span class="verified-badge">平台认证回收店</span><h2>陈先生回收店</h2><p>专业服务由平台提供，店主为你分享可信赖的闲置回收入口。</p><div class="category-row"><span>旧衣鞋包</span><span>手机数码</span><span>图书</span></div><div class="guarantee-list"><p><i>✓</i> 免费上门取件</p><p><i>✓</i> 平台统一质检</p><p><i>✓</i> 价格确认后结算</p></div><button type="button" data-root="home">发起回收</button><small>进入回收流程后不持续展示推荐店铺或归属关系</small></section>`;
  }

  function renderContentFallback(kind) {
    const fallback = model.getContentFallback(kind);
    if (!fallback) return '';
    const action = fallback.action === 'retry'
      ? 'data-content-retry'
      : fallback.action === 'training'
        ? 'data-go-back'
        : 'data-page="store"';
    return `<section class="content-fallback ${kind}"><span aria-hidden="true">!</span><h2>${fallback.title}</h2><p>${fallback.description}</p><button type="button" ${action}>${fallback.actionLabel}</button></section>`;
  }

  function renderTraining() {
    if (['empty', 'load-error', 'network-error'].includes(state.contentScenario)) {
      return renderContentFallback(state.contentScenario);
    }
    const momentCards = trainingContent.发圈工具.map((item, index) => `<article class="moment-card"><button class="moment-visual ${item.tone}" type="button" data-content-index="${index}"><span>${item.category}</span><i>图文 · ${item.meta.includes('3张') ? '3张配图' : '2张配图'}</i></button><div class="moment-copy"><span>发圈图文</span><h3>${item.title}</h3><p>朋友圈文案与配图已组合，可直接复制并保存配图。</p><div><button type="button" data-toast="文案已复制">复制文案</button><button type="button" data-toast="配图已保存">保存配图</button></div></div></article>`).join('');
    const videoCards = trainingContent.视频素材.map((item, index) => `<article class="video-card"><button class="video-preview ${item.tone}" type="button" data-content-index="${index}"><span>${item.category}</span><i class="video-play">▶</i><b class="video-duration">${item.meta.split(' · ')[0]}</b></button><div class="video-info"><span>${item.meta.split(' · ')[1]}</span><h3>${item.title}</h3><div><button type="button" data-content-index="${index}">播放视频</button><button type="button" data-toast="视频素材已保存">保存视频</button></div></div></article>`).join('');
    const learningCards = trainingContent.学习资料.map((item, index) => `<article class="learning-card ${item.locked ? 'locked' : ''}"><button class="learning-thumb ${item.tone}" type="button" data-content-index="${index}"><span>图文资料</span><b>${item.locked ? '锁' : '读'}</b></button><div class="learning-info"><span>${item.category}</span><h3>${item.title}</h3><p class="learning-summary">${item.locked ? '学习常见鞋服成色、瑕疵和可回收判断方法。' : '从开店准备、客户沟通到订单跟进，快速了解经营流程。'}</p><small>${item.meta}</small><button type="button" data-content-index="${index}">${item.action}</button></div></article>`).join('');
    const contentByTab = { 发圈工具: `<section class="moment-feed">${momentCards}</section>`, 视频素材: `<section class="video-feed">${videoCards}</section>`, 学习资料: `<section class="learning-feed">${learningCards}</section>` };
    return `<section class="training-hero"><span>专属素材</span><h2>经营内容工具</h2><p>发圈素材按图文展示，视频可直接预览，学习资料以文章形式阅读。</p></section>
      <div class="material-tabs">${Object.keys(trainingContent).map((tab) => `<button class="${state.materialTab === tab ? 'active' : ''}" type="button" data-material-tab="${tab}">${tab}</button>`).join('')}</div>
      ${contentByTab[state.materialTab]}`;
  }

  function renderContent() {
    if (state.contentScenario === 'unavailable') return renderContentFallback('unavailable');
    const item = state.selectedContent || trainingContent.学习资料[0];
    if (item.locked) return `<section class="locked-content"><span class="lock-symbol">锁</span><h2>${item.title}</h2><p>该内容需要轻享店主·LV5解锁。当前等级 LV${state.level}，还差 11 位团队店主。</p><button type="button" data-page="growth">查看解锁条件</button></section>`;
    return `<section class="content-detail"><span class="section-label">${item.category}</span><h2>${item.title}</h2><p>${item.meta}</p><div class="content-media">${state.materialTab === '视频素材' ? '<span class="play-button">▶</span><small>视频播放演示</small>' : '<strong>店主经营内容示例</strong><p>围绕真实回收场景，向客户说明可回收品类、服务流程与平台保障。内容不承诺预测收益，也不披露客户隐私。</p>'}</div><button type="button" data-toast="内容操作已完成">${item.action}</button></section>`;
  }

  function renderRules() {
    return `<section class="rules-page"><h2>经营规则说明</h2><article><b>店铺定位</b><p>平台负责回收、物流、质检、售后和结算；店主负责客户触达、内容传播与关系经营。</p></article><article><b>客户归因</b><p>已绑定客户不会因点击其他店铺链接改变归属。</p></article><article><b>收益边界</b><p>店铺收益不等于平台成交额；回收收入和拉新收益不计入店主升级指标。</p></article><article class="same-rate-rule"><div class="rule-card-heading"><span>重点规则</span><b>同档店铺收益规则</b></div><p>店铺收益比例由店铺档位和订单生效规则决定。直属上下级存在比例差时，上级店铺可按规则获得收益；比例相同时不产生上级店铺收益。</p><div class="rule-table"><span>例如：店铺档位收益对照</span><table aria-label="同档店铺收益示例"><thead><tr><th>收益结果</th><th>你的店铺档位</th><th>直属店铺档位</th><th>店铺收益比例</th></tr></thead><tbody><tr class="rule-earned"><td><strong>成功获得收益</strong></td><td>星享店主<small>示例20%</small></td><td>轻享店主<small>示例15%</small></td><td><b>示例5%</b><small>存在比例差</small></td></tr><tr class="rule-not-earned"><td><strong>未获得收益</strong></td><td>轻享店主<small>示例15%</small></td><td>轻享店主<small>示例15%</small></td><td><b>0%</b><small>比例相同</small></td></tr></tbody></table></div><div class="rule-result-note"><strong>规则说明</strong><p>直属店主及其店铺客户产生的订单仍归实际经营店铺；上级店铺仅在存在有效比例差时获得店铺收益。</p></div><small>以上档位和比例仅用于说明计算方式，不代表最终比例；实际以订单生效时的店铺收益规则为准。</small></article></section>`;
  }

  function renderStatus() {
    const impact = model.getStatusImpact(state.status);
    return `<section class="status-page"><span class="status-chip ${statusTone(state.status)}">${state.status}</span><h2>当前经营状态说明</h2><p>历史收益${impact.keepHistoryIncome ? '继续保留' : '受限'}；升级${impact.canUpgrade ? '可正常进行' : '暂时停止'}；新增经营收益${impact.canEarnNewIncome ? '按规则计算' : '暂时停止'}。</p><button type="button" data-page="advisor">联系运营老师</button></section>`;
  }

  function renderAdvisor() {
    return `<section class="advisor-page"><div class="advisor-page-head"><span>专属运营服务</span><h2>陈老师 · 店主运营顾问</h2><p>工作日 09:00—18:00，开店、经营恢复和LV12资格均由运营老师线下承接。</p></div><div class="qr-card"><div class="qr-code" aria-label="运营老师微信码">极X<br>运营</div><div><strong>运营老师微信码</strong><small>扫码添加后，请备注“店铺编号 JX-0805168”</small></div></div><button type="button" data-toast="运营老师微信码已保存">保存微信码</button></section>`;
  }

  function renderEmpty(root) {
    const names = { home: '首页回收服务', promotion: '推广内容', orders: '我的订单' };
    return `<section class="empty-root"><span>基础功能示意</span><h2>${names[root]}</h2><p>本轮重点演示“我的”与“我的回收店”经营链路。</p><button type="button" data-root="mine">返回我的</button></section>`;
  }

  function renderUpgradeModal() {
    const feedback = model.getUpgradeFeedback(state.level);
    modal.innerHTML = `<div class="modal-card"><button class="modal-close" type="button" data-close-modal>×</button><span>${feedback.type === 'automatic' ? '升级成功' : '资格达标'}</span><h2>${feedback.identity}·LV${feedback.targetLevel}</h2><p>${feedback.type === 'automatic' ? '新等级与权益已自动生效。' : '已获得超级合伙人资格，请联系专属顾问完成线下审核。'}</p><div class="modal-benefits">${feedback.newBenefits.map((item) => `<b>新增 · ${item}</b>`).join('')}</div><button type="button" data-close-modal>${feedback.type === 'automatic' ? '查看成长权益' : '联系专属顾问'}</button></div>`;
    modal.hidden = false;
  }

  function renderBenefitHelpModal(level) {
    const usage = model.getBenefitUsage(level);
    modal.innerHTML = `<div class="upgrade-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="benefit-help-title"><button class="modal-close" type="button" data-close-modal aria-label="关闭">×</button><span class="modal-kicker">权益说明</span><h2 id="benefit-help-title">LV${level} 权益使用说明</h2><p>当前等级权益已生效，可从下列入口使用。</p><div class="benefit-usage-list">${usage.map((item) => `<article><strong>${item.name}</strong><span>${item.description}</span></article>`).join('')}</div><button type="button" data-close-modal>我知道了</button></div>`;
    modal.hidden = false;
  }

  function renderUpgradeConditionsModal(level) {
    const rule = model.getUpgradeConditions(level);
    const currentValues = new Map(conditions.map((item) => [item.name, item]));
    const card = model.getLevelCards(state.level).find((item) => item.level === level);
    const newBenefits = card ? card.benefits.filter((item) => item.isNew) : [];
    const conditionRows = rule.conditions.length
      ? rule.conditions.map((item) => {
        const current = currentValues.get(item.name);
        const currentValue = item.money ? money(current.current) : `${current.current}${item.unit}`;
        const targetValue = item.money ? money(item.target) : `${item.target}${item.unit}`;
        return `<article><div><strong>${item.name}</strong><small>当前 ${currentValue}</small></div><b>目标 ${targetValue}</b></article>`;
      }).join('')
      : '<p class="modal-rule-note">达到 LV12 资格后，请联系专属顾问完成线下审核。</p>';
    modal.innerHTML = `<div class="upgrade-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-conditions-title"><button class="modal-close" type="button" data-close-modal aria-label="关闭">×</button><span class="modal-kicker">升级条件</span><h2 id="upgrade-conditions-title">LV${level} 升级条件</h2><p>${rule.relation === 'all' ? '以下指标需全部满足，结算数据以当前规则版本为准。' : '该等级需要完成线下资格审核。'}</p><div class="modal-condition-list">${conditionRows}</div>${newBenefits.length ? `<div class="modal-new-benefits"><strong>达标后新增权益</strong>${newBenefits.map((item) => `<span>${item.name}</span>`).join('')}</div>` : ''}<button type="button" data-close-modal>我知道了</button></div>`;
    modal.hidden = false;
  }

  function renderLockedIncomeHelpModal() {
    modal.innerHTML = `<div class="upgrade-modal detail-modal income-help-modal" role="dialog" aria-modal="true" aria-labelledby="locked-income-help-title"><button class="modal-close" type="button" data-close-modal aria-label="关闭">×</button><span class="modal-kicker">收益说明</span><h2 id="locked-income-help-title">待解锁拉新收益</h2><p>这笔金额已经记录，但尚未达到拉新收益解锁条件。</p><div class="income-flow-steps"><article><i>1</i><div><strong>收益形成</strong><span>完成符合规则的拉新后，金额先计入待解锁拉新收益。</span></div></article><article><i>2</i><div><strong>解锁后</strong><span>满足解锁条件后，金额转入待结算店铺收益。</span></div></article><article><i>3</i><div><strong>结算后</strong><span>平台完成结算后，金额进入可提现余额。</span></div></article></div><button type="button" data-close-modal>我知道了</button></div>`;
    modal.hidden = false;
  }

  function renderCityPickerSheet() {
    const cities = cityCatalog[state.cityPickerProvince];
    modal.innerHTML = `<div class="city-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="city-picker-title"><div class="city-picker-head"><button type="button" data-close-modal>取消</button><strong id="city-picker-title">选择所在城市</strong><button type="button" data-city-confirm>确认</button></div><p>先选择省份，再选择城市</p><div class="city-picker-columns"><section><span>省份</span><div>${Object.keys(cityCatalog).map((province) => `<button class="${state.cityPickerProvince === province ? 'active' : ''}" type="button" data-city-province="${province}">${province}</button>`).join('')}</div></section><section><span>城市</span><div>${cities.map((city) => `<button class="${state.cityPickerCity === city ? 'active' : ''}" type="button" data-city-option="${city}">${city}</button>`).join('')}</div></section></div></div>`;
    modal.hidden = false;
  }

  function renderPhoneAuthorizationSheet() {
    phoneAuthorizationPanel.innerHTML = `<section class="phone-authorization-sheet" role="dialog" aria-modal="true" aria-labelledby="phone-authorization-title"><div class="phone-authorization-app"><i>极X</i><span><strong>极X星球</strong><small>申请获取你的手机号</small></span></div><h2 id="phone-authorization-title">申请获取你的手机号</h2><p>用于开店登记和运营联系，授权后仍可在输入框中手动修改。</p><div class="phone-authorization-actions"><button type="button" data-phone-authorize-deny>拒绝</button><button type="button" data-phone-authorize-allow>允许</button></div></section>`;
    phoneAuthorizationPanel.hidden = false;
  }

  function renderCityPickerModal() {
    const currentCity = document.querySelector('#registration-form [name="city"]')?.value || '上海市';
    const matchedProvince = Object.keys(cityCatalog).find((province) => cityCatalog[province].includes(currentCity)) || '上海市';
    state.cityPickerProvince = matchedProvince;
    state.cityPickerCity = currentCity;
    renderCityPickerSheet();
  }

  function renderCooperationRulesModal() {
    const rules = [
      ['合作定位', '平台负责回收服务、物流、质检、售后与结算；店主负责合规分享、客户触达和关系维护，不代表平台作出价格或收益承诺。'],
      ['店铺名称', '店铺名称默认按“名称＋的回收店”生成。为保障合规与识别清晰，平台可要求调整不适宜或易引起误解的名称。'],
      ['客户归属', '客户归属以平台有效绑定记录为准；已绑定客户不会因点击其他店铺链接改变归属，禁止诱导改绑或虚构客户关系。'],
      ['收益与结算', '店铺收益按届时有效的等级、档位与结算规则计算，不构成固定收益承诺；退款、取消、异常或同档无差额场景可能不产生店铺收益。'],
      ['内容与行为规范', '分享内容应真实、清晰，不得夸大回收价格、承诺保底收益、冒用平台名义或发布违法违规及侵犯他人权益的信息。'],
      ['隐私保护', '仅可在经营所需范围内使用客户信息，不得索取身份证、银行卡等无关资料，不得泄露、出售或用于回收服务以外的用途。'],
      ['状态与退出', '休眠、冻结、终止或退出状态将按规则影响新增绑定、店铺收益、分享链接和升级资格；历史收益依有效结算结果处理。'],
      ['规则生效', '勾选并提交即表示已阅读并同意本规范。规则更新后将通过页面提示；涉及重大权益变化时，以更新后的公示内容和生效时间为准。'],
    ];
    modal.innerHTML = `<div class="upgrade-modal detail-modal cooperation-rules-modal" role="dialog" aria-modal="true" aria-labelledby="cooperation-rules-title"><button class="modal-close" type="button" data-close-modal aria-label="关闭">×</button><span class="modal-kicker">开店前请阅读</span><h2 id="cooperation-rules-title">店主合作规范</h2><p>本规范用于明确回收店主与平台之间的经营边界，不构成固定收益或回收价格承诺。</p><div class="cooperation-rule-list">${rules.map(([title, description], index) => `<article><i>${index + 1}</i><div><strong>${title}</strong><span>${description}</span></div></article>`).join('')}</div><button type="button" data-close-modal>我已了解</button></div>`;
    modal.hidden = false;
  }

  function renderLevelRoadmapModal() {
    const roadmap = model.getLevelRoadmap(state.level);
    modal.innerHTML = `<div class="upgrade-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="level-roadmap-title"><button class="modal-close" type="button" data-close-modal aria-label="关闭">×</button><span class="modal-kicker">成长路线</span><h2 id="level-roadmap-title">全部等级权益</h2><p>继续成长，逐级解锁新的经营能力与专属支持。</p><div class="level-roadmap-list">${roadmap.map((item) => `<article><strong>LV${item.level}</strong><div><span>${item.identity}</span><small>${item.newBenefits.join(' · ')}</small></div></article>`).join('')}</div><button type="button" data-close-modal>我知道了</button></div>`;
    modal.hidden = false;
  }

  function bindLevelCarouselIndicators() {
    const carousel = content.querySelector('.level-carousel');
    if (!carousel) return;
    const cards = [...carousel.querySelectorAll('[data-level-card]')];
    const dots = [...content.querySelectorAll('[data-level-dot]')];
    if (!cards.length || !dots.length) return;

    const updateActiveDot = () => {
      const viewportCenter = carousel.scrollLeft + carousel.clientWidth / 2;
      let activeIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          activeIndex = index;
        }
      });
      dots.forEach((dot, index) => {
        const active = index === activeIndex;
        dot.classList.toggle('active', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };

    let updateQueued = false;
    carousel.addEventListener('scroll', () => {
      if (updateQueued) return;
      updateQueued = true;
      requestAnimationFrame(() => {
        updateQueued = false;
        updateActiveDot();
      });
    }, { passive: true });
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
      cards[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }));
    updateActiveDot();
  }

  function render() {
    renderHeader();
    const renderers = {
      mine: renderMine, register: renderRegister, 'register-success': renderRegisterSuccess, store: renderStore,
      growth: renderGrowth, wallet: renderWallet, 'team-orders': renderTeamOrders, team: renderTeam,
      share: renderShare, landing: renderLanding, training: renderTraining, content: renderContent,
      rules: renderRules, status: renderStatus, advisor: renderAdvisor,
    };
    content.innerHTML = renderers[state.page] ? renderers[state.page]() : renderEmpty(state.root);
    bindLevelCarouselIndicators();
    document.querySelectorAll('[data-bottom-nav] button').forEach((button) => button.classList.toggle('active', button.dataset.root === state.root));
  }

  function goTo(page) {
    if (page !== state.page) state.history.push(state.page);
    state.page = page;
    render();
    content.scrollTop = 0;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.addEventListener('click', (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) goTo(pageButton.dataset.page);
    const rootButton = event.target.closest('[data-root]');
    if (rootButton) {
      state.root = rootButton.dataset.root;
      state.page = state.root === 'mine' ? 'mine' : state.root;
      state.history = [];
      render();
    }
    if (event.target.closest('[data-go-back]')) {
      state.page = state.history.pop() || 'mine';
      render();
    }
    const timeButton = event.target.closest('[data-time-scope]');
    if (timeButton) { state.timeScope = timeButton.dataset.timeScope; render(); }
    const incomeButton = event.target.closest('[data-income-filter]');
    if (incomeButton) { state.incomeFilter = incomeButton.dataset.incomeFilter; render(); }
    const orderButton = event.target.closest('[data-order-filter]');
    if (orderButton) { state.orderFilter = orderButton.dataset.orderFilter; render(); }
    const teamButton = event.target.closest('[data-team-filter]');
    if (teamButton) { state.teamFilter = teamButton.dataset.teamFilter; render(); }
    const materialButton = event.target.closest('[data-material-tab]');
    if (materialButton) { state.materialTab = materialButton.dataset.materialTab; render(); }
    if (event.target.closest('[data-content-retry]')) {
      state.contentScenario = 'normal';
      contentStateSelect.value = 'normal';
      render();
    }
    const contentButton = event.target.closest('[data-content-index]');
    if (contentButton) { state.selectedContent = trainingContent[state.materialTab][Number(contentButton.dataset.contentIndex)]; goTo('content'); }
    const benefitHelpButton = event.target.closest('[data-benefit-help]');
    if (benefitHelpButton) renderBenefitHelpModal(Number(benefitHelpButton.dataset.benefitHelp));
    const upgradeConditionsButton = event.target.closest('[data-upgrade-conditions]');
    if (upgradeConditionsButton) renderUpgradeConditionsModal(Number(upgradeConditionsButton.dataset.upgradeConditions));
    if (event.target.closest('[data-locked-income-help]')) renderLockedIncomeHelpModal();
    if (event.target.closest('[data-level-roadmap]')) renderLevelRoadmapModal();
    const copyUserIdButton = event.target.closest('[data-copy-user-id]');
    if (copyUserIdButton) {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(copyUserIdButton.dataset.copyUserId).catch(() => {});
      showToast('ID 已复制');
    }
    if (event.target.closest('[data-phone-authorization]') && !state.phoneAuthorized) renderPhoneAuthorizationSheet();
    if (event.target.closest('[data-phone-authorize-deny]')) phoneAuthorizationPanel.hidden = true;
    if (event.target.closest('[data-phone-authorize-allow]')) {
      const phoneInput = document.querySelector('#registration-form [name="phone"]');
      if (phoneInput) phoneInput.value = '13800006815';
      state.phoneAuthorized = true;
      phoneAuthorizationPanel.hidden = true;
      showToast('手机号授权成功，可继续修改');
    }
    if (event.target.closest('[data-city-picker]')) renderCityPickerModal();
    const provinceButton = event.target.closest('[data-city-province]');
    if (provinceButton) {
      state.cityPickerProvince = provinceButton.dataset.cityProvince;
      state.cityPickerCity = cityCatalog[state.cityPickerProvince][0];
      renderCityPickerSheet();
    }
    const cityButton = event.target.closest('[data-city-option]');
    if (cityButton) {
      state.cityPickerCity = cityButton.dataset.cityOption;
      renderCityPickerSheet();
    }
    if (event.target.closest('[data-city-confirm]')) {
      const cityInput = document.querySelector('#registration-form [name="city"]');
      const cityTrigger = document.querySelector('[data-city-picker] span');
      if (cityInput) cityInput.value = state.cityPickerCity;
      if (cityTrigger) cityTrigger.textContent = state.cityPickerProvince === state.cityPickerCity ? state.cityPickerCity : `${state.cityPickerProvince} ${state.cityPickerCity}`;
      modal.hidden = true;
    }
    if (event.target.closest('[data-cooperation-rules]')) renderCooperationRulesModal();
    const toastButton = event.target.closest('[data-toast]');
    if (toastButton) showToast(toastButton.dataset.toast);
    if (event.target.closest('[data-close-modal]')) modal.hidden = true;
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'registration-form') return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    const result = model.upsertRegistration(state.registration, Object.fromEntries(formData.entries()));
    state.registration = result.record;
    state.registrationResult = result.updated ? 'updated' : 'created';
    goTo('register-success');
  });

  roleSelect.addEventListener('change', () => { state.role = roleSelect.value; levelSelect.disabled = state.role !== 'owner'; state.page = 'mine'; state.history = []; render(); });
  levelSelect.addEventListener('change', () => { state.level = Number(levelSelect.value); state.teamFilter = '全部'; render(); });
  statusSelect.addEventListener('change', () => { state.status = statusSelect.value; render(); });
  contentStateSelect.addEventListener('change', () => { state.contentScenario = contentStateSelect.value; render(); });
  scenarioToggle.addEventListener('click', () => { const open = scenarioPanel.classList.toggle('open'); scenarioToggle.setAttribute('aria-expanded', String(open)); });
  upgradeButton.addEventListener('click', renderUpgradeModal);
  document.querySelectorAll('[data-scenario]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.scenario === 'ordinary') { state.role = 'user'; state.level = 1; state.status = '正常'; }
    if (button.dataset.scenario === 'dormant') { state.role = 'owner'; state.level = 6; state.status = '休眠'; }
    if (button.dataset.scenario === 'partner') { state.role = 'owner'; state.level = 11; state.status = '正常'; }
    roleSelect.value = state.role; levelSelect.value = String(Math.max(2, state.level)); statusSelect.value = state.status; levelSelect.disabled = state.role !== 'owner'; state.page = 'mine'; state.history = []; render();
  }));
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.hidden = true; });
  phoneAuthorizationPanel.addEventListener('click', (event) => { if (event.target === phoneAuthorizationPanel) phoneAuthorizationPanel.hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { modal.hidden = true; phoneAuthorizationPanel.hidden = true; } });

  render();
})();
