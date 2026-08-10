import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));

function loadGlobalScript(path, globalName) {
  const source = readFileSync(path, 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: path });
  return sandbox[globalName];
}

function miniModel() {
  return loadGlobalScript(`${root}/model.js`, 'MiniProgramModel');
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `缺少起始标识：${startMarker}`);
  assert.notEqual(end, -1, `缺少结束标识：${endMarker}`);
  return source.slice(start, end);
}

test('普通用户固定为LV1且不展示店主经营能力', () => {
  const result = JSON.parse(JSON.stringify(miniModel().getIdentityView({ role: 'user', level: 8 })));
  assert.deepEqual(result, { identity: '普通用户', level: 1, showStoreArea: false });
});

test('店主等级使用新版店主称谓', () => {
  const model = miniModel();
  assert.equal(model.getIdentityView({ role: 'owner', level: 2 }).identity, '成长店主');
  assert.equal(model.getIdentityView({ role: 'owner', level: 4 }).identity, '轻享店主');
  assert.equal(model.getIdentityView({ role: 'owner', level: 8 }).identity, '星享店主');
  assert.equal(model.getIdentityView({ role: 'owner', level: 11 }).identity, '超级店主');
});

test('全部满足取最低完成度，任一满足取最高完成度', () => {
  const conditions = [
    { current: 18, target: 20, enabled: true },
    { current: 9, target: 20, enabled: true },
    { current: 8800, target: 10000, enabled: true },
  ];
  assert.equal(miniModel().calculateProgress(conditions, 'all'), 45);
  assert.equal(miniModel().calculateProgress(conditions, 'any'), 90);
});

test('P0钱包使用统一余额并固定五种收入分类', () => {
  const model = miniModel();
  assert.equal(typeof model.getWalletSummary, 'function');
  const wallet = JSON.parse(JSON.stringify(model.getWalletSummary()));
  assert.equal(wallet.withdrawable, 2495.19);
  assert.equal(wallet.pendingBusiness, 540);
  assert.equal(wallet.lockedAcquisition, 120);
  assert.deepEqual(wallet.categories, ['回收收入', '自营业务收益', '直属客户收益', '团队收益', '拉新收益']);
});

test('收益明细可以按固定收入类型筛选', () => {
  const rows = [{ type: '回收收入' }, { type: '团队收益' }, { type: '拉新收益' }];
  assert.equal(miniModel().filterIncome(rows, '团队收益').length, 1);
  assert.equal(miniModel().filterIncome(rows, '全部').length, 3);
});

test('等级卡片展示当前级与最近两个等级并标记新增权益', () => {
  const cards = JSON.parse(JSON.stringify(miniModel().getLevelCards(4)));
  assert.deepEqual(cards.map((item) => item.level), [4, 5, 6]);
  assert.ok(cards[1].benefits.some((item) => item.isNew));
  assert.ok(cards[2].benefits.some((item) => item.isNew));
  assert.equal(cards[0].identity, '轻享店主');
});

test('等级尾卡展示当前三张卡之后的剩余等级路线', () => {
  const model = miniModel();
  assert.equal(typeof model.getLevelRoadmap, 'function');
  const roadmap = JSON.parse(JSON.stringify(model.getLevelRoadmap(4)));
  assert.deepEqual(roadmap.map((item) => item.level), [7, 8, 9, 10, 11, 12]);
  assert.deepEqual(roadmap[0].newBenefits, ['优先结算支持']);
  assert.ok(roadmap.every((item) => item.newBenefits.length > 0));
});

test('LV5和LV6升级弹窗使用后台已发布的三项门槛', () => {
  const model = miniModel();
  assert.equal(typeof model.getUpgradeConditions, 'function');
  const level5 = JSON.parse(JSON.stringify(model.getUpgradeConditions(5)));
  const level6 = JSON.parse(JSON.stringify(model.getUpgradeConditions(6)));
  assert.deepEqual(level5.conditions.map((item) => [item.name, item.target, item.unit]), [
    ['店铺客户', 20, '人'], ['店铺收益', 10000, '元'], ['团队店主', 20, '人'],
  ]);
  assert.deepEqual(level6.conditions.map((item) => [item.name, item.target, item.unit]), [
    ['店铺客户', 30, '人'], ['店铺收益', 18000, '元'], ['团队店主', 35, '人'],
  ]);
  assert.equal(level5.conditions[1].money, true);
});

test('小程序升级指标统一使用店铺客户店铺收益和团队店主', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const conditions = sourceSection(source, 'const conditions = [', 'const incomeRows = [');
  for (const marker of ['店铺客户', '店铺收益', '团队店主']) {
    assert.ok(conditions.includes(marker), `小程序升级指标缺少：${marker}`);
  }
  for (const marker of ['有效成交客户', '团队有效订单', '累计已结算店铺收益']) {
    assert.equal(conditions.includes(marker), false, `小程序升级指标仍保留旧口径：${marker}`);
  }
});

test('当前等级的每项权益都有使用说明', () => {
  const model = miniModel();
  assert.equal(typeof model.getBenefitUsage, 'function');
  const benefitNames = JSON.parse(JSON.stringify(model.getLevelCards(4)[0].benefits)).map((item) => item.name);
  const usage = JSON.parse(JSON.stringify(model.getBenefitUsage(4)));
  assert.deepEqual(usage.map((item) => item.name), benefitNames);
  assert.ok(usage.every((item) => item.description.length > 0));
});

test('团队进行中订单总数等于四种状态之和', () => {
  const model = miniModel();
  assert.equal(typeof model.summarizeOrders, 'function');
  const summary = JSON.parse(JSON.stringify(model.summarizeOrders([
    { status: '待取件' }, { status: '待取件' }, { status: '待收货' }, { status: '待质检' }, { status: '待确认' },
  ])));
  assert.deepEqual(summary, { total: 5, 待取件: 2, 待收货: 1, 待质检: 1, 待确认: 1 });
});

test('团队可见范围按店主等级区分一级和二级', () => {
  const model = miniModel();
  assert.equal(typeof model.getTeamVisibility, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(model.getTeamVisibility(10))), { depth: 1, canViewSecondLevelDetails: false });
  assert.deepEqual(JSON.parse(JSON.stringify(model.getTeamVisibility(11))), { depth: 2, canViewSecondLevelDetails: true });
});

test('冻结终止和已退出店主分享链接转平台通用页', () => {
  const model = miniModel();
  assert.equal(typeof model.getShareDestination, 'function');
  assert.equal(model.getShareDestination('正常').mode, 'store');
  assert.equal(model.getShareDestination('预警').mode, 'store');
  assert.equal(model.getShareDestination('冻结').mode, 'platform');
  assert.equal(model.getShareDestination('终止').allowAttribution, false);
});

test('休眠保留历史收益并暂停升级', () => {
  const impact = miniModel().getStatusImpact('休眠');
  assert.equal(impact.keepHistoryIncome, true);
  assert.equal(impact.canUpgrade, false);
  assert.equal(impact.canAddOwner, false);
});

test('普通等级自动升级而LV12达标只引导线下沟通', () => {
  const automatic = miniModel().getUpgradeFeedback(4);
  const partner = miniModel().getUpgradeFeedback(11);
  assert.equal(automatic.targetLevel, 5);
  assert.equal(automatic.identity, '轻享店主');
  assert.equal(partner.type, 'contact');
  assert.equal(partner.autoUpgrade, false);
});

test('小程序覆盖登记、我的回收店、统一钱包和分享页面', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  for (const marker of ['开通我的回收店', '真实姓名', '运营老师微信码', '我的回收店', '可提现余额', '团队进行中订单', '店铺专属海报', '分享落地页']) {
    assert.ok(source.includes(marker), `缺少页面标识：${marker}`);
  }
});

test('店主首屏收益摘要仅展示两项数据且整块跳转我的回收店', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const preview = sourceSection(source, 'function renderWalletPreview()', 'function renderMine()');
  for (const marker of ['本月店铺收益', '待解锁拉新收益', 'data-page="store"']) {
    assert.ok(preview.includes(marker), `收益摘要缺少：${marker}`);
  }
  for (const marker of ['可提现余额', '待结算业务收益', '查看明细', '去提现', 'data-page="wallet"']) {
    assert.equal(preview.includes(marker), false, `收益摘要不应包含：${marker}`);
  }
});

test('店主首屏先展示我的回收店入口再展示收益摘要', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  assert.ok(mine.indexOf('store-entry-card') < mine.indexOf('renderWalletPreview()'));
});

test('店主我的页依次展示回收店、首页三板块、经营收益、我的钱包和常用功能', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  const servicePanels = sourceSection(source, 'function renderMineServicePanels()', 'function renderMineWallet()');
  const wallet = sourceSection(source, 'function renderMineWallet()', 'function renderCommonFeatures()');
  const common = sourceSection(source, 'function renderCommonFeatures()', 'function renderOrdinaryStoreEntry()');
  for (const marker of ['我的评估', '我的订单', '评估师']) assert.ok(servicePanels.includes(marker), `缺少首页同款板块：${marker}`);
  assert.ok(wallet.includes('我的钱包'));
  assert.ok(common.includes('常用功能'));
  const ordered = ['store-entry-card', 'renderMineServicePanels()', 'renderWalletPreview()', 'renderMineWallet()', 'renderCommonFeatures()'];
  ordered.reduce((previous, marker) => {
    const current = mine.indexOf(marker);
    assert.ok(current > previous, `我的页模块顺序错误：${marker}`);
    return current;
  }, -1);
});

test('普通用户使用开店入口且不展示经营收益', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const entry = sourceSection(source, 'function renderOrdinaryStoreEntry()', 'function renderWalletPreview()');
  for (const marker of ['开通我的回收店', 'data-page="register"']) assert.ok(entry.includes(marker), `普通用户开店入口缺少：${marker}`);
  assert.equal(source.includes('function renderOrdinaryEarnings()'), false, '普通用户不应保留经营收益组件');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  assert.equal(mine.includes('renderOrdinaryEarnings()'), false, '普通用户不应渲染经营收益');
});

test('小程序培训素材覆盖三类内容和等级锁定', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  for (const marker of ['发圈工具', '视频素材', '学习资料', '复制文案', '保存素材', '查看解锁条件']) {
    assert.ok(source.includes(marker));
  }
});

test('店主我的页只保留我的回收店入口', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  assert.ok(mine.includes('进入我的回收店'));
  assert.equal(mine.includes('店主服务'), false);
});

test('我的回收店区分分享店铺与专属素材并提供客服入口', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const store = sourceSection(source, 'function renderStore()', 'function renderGrowth()');
  assert.match(store, /data-page="share"[^>]*>[\s\S]*?分享店铺/);
  assert.match(store, /data-page="training"[^>]*>[\s\S]*?专属素材/);
  assert.ok(store.includes('data-page="advisor"'));
  assert.ok(store.includes('查看微信码'));
});

test('成长权益展示真实指标进度与横向权益卡片', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const growth = sourceSection(source, 'function renderGrowth()', 'function renderWallet()');
  for (const marker of ['condition-row', 'progress-track', 'style="width:${ratio}%"', 'level-carousel', 'benefit-card', 'benefit-item']) {
    assert.ok(growth.includes(marker), `成长权益缺少结构：${marker}`);
  }
  assert.equal(growth.includes('level-card-track'), false);
});

test('成长权益按钮打开权益说明和下两级升级条件弹窗', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const growth = sourceSection(source, 'function renderGrowth()', 'function renderWallet()');
  for (const marker of ['data-benefit-help', 'data-upgrade-conditions']) {
    assert.ok(growth.includes(marker), `成长权益按钮缺少弹窗入口：${marker}`);
  }
  for (const marker of ['function renderBenefitHelpModal', 'function renderUpgradeConditionsModal', 'modal-condition-list']) {
    assert.ok(source.includes(marker), `缺少弹窗实现：${marker}`);
  }
  for (const marker of ['.detail-modal', '.modal-condition-list']) {
    assert.ok(styles.includes(marker), `缺少弹窗样式：${marker}`);
  }
});

test('全部等级卡片的操作按钮固定在卡片底部', () => {
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  assert.match(styles, /\.benefit-card\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/, '等级卡片需要使用纵向弹性布局');
  assert.match(styles, /\.benefit-card\s*>\s*button\s*\{[^}]*margin-top:\s*auto;/, '等级卡片按钮需要自动占据上方剩余空间');
});

test('等级权益指示点随卡片滚动更新并支持点击定位', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const growth = sourceSection(source, 'function renderGrowth()', 'function renderWallet()');
  const binding = sourceSection(source, 'function bindLevelCarouselIndicators()', 'function render()');
  for (const marker of ['data-level-card', 'data-level-dot']) assert.ok(growth.includes(marker), `等级轮播缺少索引：${marker}`);
  for (const marker of ["addEventListener('scroll'", "classList.toggle('active'", 'requestAnimationFrame', 'scrollIntoView']) {
    assert.ok(binding.includes(marker), `等级轮播联动缺少：${marker}`);
  }
  assert.ok(source.includes('bindLevelCarouselIndicators();'), '页面渲染后没有绑定等级轮播联动');
  assert.ok(styles.includes('.level-dots button.locked.active'), '锁定指示点缺少激活样式');
});

test('成长权益轮播末尾保留锁定尾卡但不展示全部等级按钮', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const growth = sourceSection(source, 'function renderGrowth()', 'function renderWallet()');
  for (const marker of ['more-benefits-card', '升级解锁更多权益', 'class="locked"']) {
    assert.ok(growth.includes(marker), `成长权益尾卡缺少：${marker}`);
  }
  assert.equal(growth.includes('查看全部等级权益'), false, '锁定尾卡不应展示查看全部等级权益按钮');
  assert.equal(growth.includes('data-level-roadmap'), false, '锁定尾卡不应保留全部等级按钮事件');
  for (const marker of ['function renderLevelRoadmapModal', 'level-roadmap-list']) {
    assert.ok(source.includes(marker), `缺少等级路线弹窗：${marker}`);
  }
  for (const marker of ['.more-benefits-card', '.level-dots button.locked', '.level-roadmap-list']) {
    assert.ok(styles.includes(marker), `缺少等级尾卡样式：${marker}`);
  }
});

test('客户与团队恢复升级贡献、三栏概览和脱敏成员行', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of ['team-contribution', '团队店主', 'team-overview', 'team-tabs', 'person-row', 'person-button']) {
    assert.ok(team.includes(marker), `客户与团队缺少结构：${marker}`);
  }
});

test('LV11和LV12团队概览增加团队数量数据块', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of ['visibility.depth === 2', '团队数量', 'team-overview extended']) {
    assert.ok(team.includes(marker), `高等级团队概览缺少：${marker}`);
  }
  assert.ok(styles.includes('.team-overview.extended'), '缺少四栏团队概览样式');
});

test('LV11和LV12提供团队数据筛选并复用成员列表', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of ['二级店主', '团队数据', "state.teamFilter === '团队数据'", 'person-row', 'person-button']) {
    assert.ok(team.includes(marker), `高等级团队数据缺少：${marker}`);
  }
  assert.ok(source.includes('const teamDataMembers = ['), '缺少团队成员示例数据');
  assert.ok(!team.includes('team-order-list'), '团队数据不应使用订单列表结构');
  assert.ok(!source.includes('const teamOrderRows = ['), '不应保留团队订单示例数据');
  assert.ok(!styles.includes('.team-order-card'), '不应保留团队订单卡片样式');
});

test('专属素材为发圈、视频和学习资料使用不同展示结构', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const training = sourceSection(source, 'function renderTraining()', 'function renderContent()');
  for (const marker of ['专属素材', 'moment-card', 'video-card', 'learning-card', 'video-duration', 'learning-summary']) {
    assert.ok(training.includes(marker), `专属素材缺少结构：${marker}`);
  }
});

test('小程序二级页面按实际访问路径返回', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  assert.ok(source.includes('state.history.push(state.page)'));
  assert.ok(source.includes('state.history.pop()'));
  assert.ok(source.includes('data-go-back'));
});

test('小程序入口保留独立挂载点和场景控制', () => {
  const html = readFileSync(`${root}/index.html`, 'utf8');
  assert.ok(html.includes('id="prototype-app"'));
  assert.ok(html.includes('id="scenario-controls"'));
});
