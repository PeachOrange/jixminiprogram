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

test('店铺进行中订单主信息区右侧突出展示每笔预估收益', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const orderData = sourceSection(source, 'const teamOrders = [', 'const teamDataMembers = [');
  const orderPage = sourceSection(source, 'function renderTeamOrders()', 'function renderTeam()');
  assert.equal((orderData.match(/estimatedIncome:/g) || []).length, 5, '每条进行中订单都应提供预估收益');
  for (const marker of ['预估收益', 'order-estimated-income', 'money(row.estimatedIncome)']) {
    assert.ok(orderPage.includes(marker), `订单列表缺少预估收益展示：${marker}`);
  }
  assert.match(
    orderPage,
    /<article><div>.*<em class="order-estimated-income">.*<\/em><\/div><p><b>.*<\/b><span>.*<\/span><\/p><\/article>/,
    '预估收益应位于订单主信息区右侧，底部仅保留订单编号和更新时间',
  );
  assert.ok(styles.includes('.order-estimated-income'), '缺少预估收益金额样式');
  assert.match(styles, /\.order-list article\s*>\s*div\s*\{[^}]*grid-template-columns:\s*auto 1fr auto;/, '订单主信息区需要为收益预留右侧列');
  assert.match(styles, /\.order-estimated-income\s*\{[^}]*grid-column:\s*3;[^}]*grid-row:\s*1\s*\/\s*3;/, '预估收益需要固定在主信息区右侧');
  assert.match(styles, /\.order-estimated-income strong\s*\{[^}]*color:\s*var\(--coral\);[^}]*font-size:\s*13px;/, '预估收益金额需要使用醒目颜色并放大');
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

test('小程序登记首次创建并在重复提交时更新同一记录', () => {
  const model = miniModel();
  assert.equal(typeof model.upsertRegistration, 'function');
  const first = model.upsertRegistration(null, {
    realName: '陈先生', phone: '138****6815', wechat: '', city: '上海市', storeName: '不应采用的店名',
  });
  const second = model.upsertRegistration(first.record, {
    realName: '陈老师', phone: '13900006815', wechat: 'chen-two', city: '杭州市', storeName: '另一个店名',
  });
  assert.equal(first.updated, false);
  assert.equal(second.updated, true);
  assert.equal(second.record.wechat, 'chen-two');
  assert.equal(second.record.phone, '13900006815');
  assert.equal(second.record.city, '杭州市');
  assert.equal(first.record.storeName, '陈先生的回收店');
  assert.equal(second.record.storeName, '陈老师的回收店');
});

test('小程序登记页回显已有记录并区分资料更新结果', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const register = sourceSection(source, 'function renderRegister()', 'function renderRegisterSuccess()');
  const submit = sourceSection(source, "document.addEventListener('submit'", "roleSelect.addEventListener('change'");
  for (const marker of ['state.registration', '查看开店登记', '更新登记资料', '登记资料已更新']) {
    assert.ok(source.includes(marker), `登记重入缺少：${marker}`);
  }
  assert.ok(register.includes('state.registration'));
  assert.ok(submit.includes('new FormData(event.target)'));
  assert.ok(submit.includes('model.upsertRegistration'));
});

test('小程序覆盖登记、我的回收店、统一钱包和分享页面', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  for (const marker of ['开通我的回收店', '<span>名称</span>', '运营老师微信码', '我的回收店', '可提现余额', '店铺进行中订单', '店铺专属海报', '分享落地页']) {
    assert.ok(source.includes(marker), `缺少页面标识：${marker}`);
  }
});

test('开店登记使用名称、可编辑手机号和选填微信号且不展示店名预览', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const register = sourceSection(source, 'function renderRegister()', 'function renderRegisterSuccess()');
  for (const marker of [
    '<span>名称</span>',
    '微信号 <small>选填</small>',
  ]) {
    assert.ok(register.includes(marker), `登记表单缺少：${marker}`);
  }
  assert.equal(register.includes('真实姓名'), false, '登记表单不应继续展示真实姓名');
  assert.equal(register.includes('readonly'), false, '手机号必须允许手动修改');
  assert.equal(register.includes('name="storeName"'), false, '不应保留店铺名称输入框');
  assert.equal(register.includes('微信已授权'), false, '手机号右侧不应保留微信授权状态');
  assert.equal(register.includes('wechat-authorized-status'), false, '手机号右侧不应保留授权状态元素');
  assert.equal(register.includes('store-name-preview'), false, '不应展示自动店名预览卡片');
  assert.equal(source.includes('data-store-name-preview'), false, '不应保留店名预览事件目标');
  assert.equal(register.includes('name="wechat" value="${escapeAttribute(registration.wechat)}" placeholder="用于运营老师联系" required'), false, '微信号不应必填');
  assert.equal(styles.includes('.store-name-preview'), false, '不应保留自动店名预览样式');
  assert.equal(styles.includes('.wechat-authorized-status'), false, '不应保留微信授权状态样式');
});

test('点击手机号输入框从设备底部打开微信授权面板', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const html = readFileSync(`${root}/index.html`, 'utf8');
  const register = sourceSection(source, 'function renderRegister()', 'function renderRegisterSuccess()');
  assert.ok(register.includes('data-phone-authorization'), '手机号输入框缺少授权触发标识');
  for (const marker of [
    "document.getElementById('phone-authorization-panel')",
    'function renderPhoneAuthorizationSheet()',
    '申请获取你的手机号',
    '用于开店登记和运营联系',
    'data-phone-authorize-deny',
    'data-phone-authorize-allow',
    '>拒绝<',
    '>允许<',
    "event.target.closest('[data-phone-authorization]')",
    "document.querySelector('#registration-form [name=\"phone\"]')",
  ]) {
    assert.ok(source.includes(marker), `手机号授权交互缺少：${marker}`);
  }
  assert.ok(html.includes('id="phone-authorization-panel"'), '设备内缺少手机号授权面板挂载点');
  assert.match(html, /<div class="phone-authorization-panel" id="phone-authorization-panel" hidden><\/div>\s*<nav class="bottom-nav"/, '授权面板应位于设备内并覆盖底部导航');
  for (const marker of ['.phone-authorization-panel', '.phone-authorization-sheet', '.phone-authorization-actions']) {
    assert.ok(styles.includes(marker), `手机号授权面板缺少样式：${marker}`);
  }
});

test('开店登记提供底部省市选择器和店主合作规范弹窗', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const register = sourceSection(source, 'function renderRegister()', 'function renderRegisterSuccess()');
  for (const marker of ['data-city-picker', 'name="city"', 'data-cooperation-rules', '《店主合作规范》']) {
    assert.ok(register.includes(marker), `登记入口缺少：${marker}`);
  }
  assert.equal(register.includes('<select name="city"'), false, '城市不应继续使用原生下拉框');
  for (const marker of [
    'function renderCityPickerModal',
    'data-city-province',
    'data-city-option',
    'data-city-confirm',
    'function renderCooperationRulesModal',
    '合作定位',
    '客户归属',
    '收益与结算',
    '内容与行为规范',
    '隐私保护',
    '状态与退出',
    '规则生效',
  ]) {
    assert.ok(source.includes(marker), `登记弹层缺少：${marker}`);
  }
  for (const marker of ['.city-picker-sheet', '.city-picker-columns', '.agreement-link', '.cooperation-rule-list']) {
    assert.ok(styles.includes(marker), `登记弹层缺少样式：${marker}`);
  }
});

test('同档店铺收益规则用档位表格对照有收益和无收益场景', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const rules = sourceSection(source, 'function renderRules()', 'function renderStatus()');
  for (const marker of [
    'same-rate-rule', '同档店铺收益规则', '例如：店铺档位收益对照',
    '<table', '<thead>', '<tbody>', '收益结果', '你的店铺档位', '直属店铺档位', '店铺收益比例',
    '成功获得收益', '未获得收益', '星享店主', '轻享店主', '示例20%', '示例15%', '示例5%', '0%',
    '存在比例差', '比例相同', '仅用于说明计算方式', '实际以订单生效时的店铺收益规则为准',
  ]) {
    assert.ok(rules.includes(marker), `同档店铺收益规则缺少说明：${marker}`);
  }
  for (const marker of ['.same-rate-rule', '.rule-table', '.rule-earned', '.rule-not-earned', '.rule-result-note']) {
    assert.ok(styles.includes(marker), `同档店铺收益规则缺少表格样式：${marker}`);
  }
  assert.equal(rules.includes('均为15%'), false, '不得把示例15%写成所有轻享店主的固定比例');
});

test('店主我的页头部不展示经营状态标签', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const profile = sourceSection(source, 'function renderProfile(identity)', 'function renderMineServicePanels()');
  assert.equal(profile.includes('status-chip'), false, '店主资料头部不应展示状态标签');
  assert.equal(profile.includes('state.status'), false, '店主资料头部不应输出当前状态');
  assert.equal(profile.includes('profile-name-line'), false, '不应保留状态标签使用的姓名行容器');
  assert.equal(styles.includes('.profile-name-line'), false, '不应保留姓名状态行样式');
});

test('我的钱包二级页仅提示复用既有页面', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const wallet = sourceSection(source, 'function renderWallet()', 'function renderTeamOrders()');
  assert.ok(wallet.includes('wallet-reuse-note'), '钱包页缺少复用说明容器');
  assert.ok(wallet.includes('复用“我的钱包”页面'), '钱包页缺少复用说明');
  for (const marker of ['wallet-card', '申请提现', '收入分类说明', 'data-income-filter', 'ledger-list']) {
    assert.equal(wallet.includes(marker), false, `钱包页仍保留旧内容：${marker}`);
  }
  assert.ok(styles.includes('.wallet-reuse-note'), '缺少钱包复用说明居中样式');
});

test('店主我的页不再展示经营收益摘要卡片', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  assert.equal(source.includes('function renderWalletPreview()'), false, '不应保留经营收益摘要组件');
  assert.equal(mine.includes('renderWalletPreview()'), false, '店主我的页不应渲染经营收益摘要');
  assert.equal(mine.includes('查看我的回收店收益'), false, '店主我的页不应保留收益摘要入口');
});

test('店主我的页依次展示回收店、首页三板块、我的钱包和常用功能', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  const servicePanels = sourceSection(source, 'function renderMineServicePanels()', 'function renderMineWallet()');
  const wallet = sourceSection(source, 'function renderMineWallet()', 'function renderCommonFeatures()');
  const common = sourceSection(source, 'function renderCommonFeatures()', 'function renderOrdinaryStoreEntry()');
  for (const marker of ['我的评估', '我的订单', '评估师']) assert.ok(servicePanels.includes(marker), `缺少首页同款板块：${marker}`);
  assert.ok(wallet.includes('我的钱包'));
  assert.ok(common.includes('常用功能'));
  const ordered = ['store-entry-card', 'renderMineServicePanels()', 'renderMineWallet()', 'renderCommonFeatures()'];
  ordered.reduce((previous, marker) => {
    const current = mine.indexOf(marker);
    assert.ok(current > previous, `我的页模块顺序错误：${marker}`);
    return current;
  }, -1);
});

test('普通用户使用开店入口且不展示经营收益', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const entry = sourceSection(source, 'function renderOrdinaryStoreEntry()', 'function renderMine()');
  for (const marker of ['开通我的回收店', 'data-page="register"']) assert.ok(entry.includes(marker), `普通用户开店入口缺少：${marker}`);
  assert.equal(source.includes('function renderOrdinaryEarnings()'), false, '普通用户不应保留经营收益组件');
  const mine = sourceSection(source, 'function renderMine()', 'function renderRegister()');
  assert.equal(mine.includes('renderOrdinaryEarnings()'), false, '普通用户不应渲染经营收益');
});

test('普通用户头像区展示可复制的用户ID', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  assert.ok(source.includes('function renderOrdinaryProfile()'), '缺少普通用户头像区组件');
  const profile = sourceSection(source, 'function renderOrdinaryProfile()', 'function renderMineServicePanels()');
  for (const marker of ['profile-card', '普通用户·LV1', "const userId = '2039230691077779458'", 'ID：${userId}', 'data-copy-user-id="${userId}"', 'aria-label="复制用户ID"']) {
    assert.ok(profile.includes(marker), `普通用户头像区缺少：${marker}`);
  }
  for (const marker of ["event.target.closest('[data-copy-user-id]')", 'navigator.clipboard', "showToast('ID 已复制')"]) {
    assert.ok(source.includes(marker), `普通用户ID复制交互缺少：${marker}`);
  }
  assert.ok(styles.includes('.ordinary-profile-id'), '缺少普通用户ID行样式');
});

test('小程序培训素材覆盖三类内容和等级锁定', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  for (const marker of ['发圈工具', '视频素材', '学习资料', '复制文案', '保存素材', '查看解锁条件']) {
    assert.ok(source.includes(marker));
  }
});

test('内容负向状态提供明确文案和重试或返回动作', () => {
  const model = miniModel();
  assert.equal(typeof model.getContentFallback, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(model.getContentFallback('empty'))), {
    title: '暂无可用内容', description: '当前分类暂时没有可展示的素材。', action: 'store', actionLabel: '返回我的回收店',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(model.getContentFallback('load-error'))), {
    title: '内容加载失败', description: '内容暂时无法加载，请稍后重试。', action: 'retry', actionLabel: '重新加载',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(model.getContentFallback('network-error'))), {
    title: '网络连接异常', description: '请检查网络连接后重新尝试。', action: 'retry', actionLabel: '重新连接',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(model.getContentFallback('unavailable'))), {
    title: '内容已下架', description: '该内容暂不可查看，请返回素材列表选择其他内容。', action: 'training', actionLabel: '返回素材列表',
  });
  assert.equal(model.getContentFallback('normal'), null);
});

test('原型控制台可切换内容负向状态并提供重试返回路径', () => {
  const html = readFileSync(`${root}/index.html`, 'utf8');
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  for (const marker of ['id="content-state-select"', 'value="empty"', 'value="load-error"', 'value="network-error"', 'value="unavailable"']) {
    assert.ok(html.includes(marker), `内容情景控制缺少：${marker}`);
  }
  for (const marker of ['contentScenario', 'renderContentFallback', 'data-content-retry', "state.contentScenario = 'normal'"]) {
    assert.ok(source.includes(marker), `内容负向状态接线缺少：${marker}`);
  }
  assert.ok(styles.includes('.content-fallback'));
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

test('回收店以四项分层指标展示经营数据并解释拉新收益去向', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const store = sourceSection(source, 'function renderStore()', 'function renderGrowth()');
  for (const marker of [
    'store-metric-panel', 'metric-finance-grid', 'metric-help-button', 'metric-operation-grid',
    '待结算店铺收益', '待解锁拉新收益', '店铺订单', '新增店铺客户',
  ]) {
    assert.ok(store.includes(marker), `回收店口径缺少：${marker}`);
  }
  assert.equal((store.match(/<article/g) || []).length, 4, '经营指标应收敛为四张卡片');
  for (const marker of ['income-flow-note', '待结算业务收益', '<span>有效订单', '团队有效订单', '新增绑定客户', '可见团队范围', '可见团队等级']) {
    assert.equal(store.includes(marker), false, `回收店仍保留旧指标：${marker}`);
  }
  for (const marker of ['.store-metric-panel', '.metric-finance-grid', '.metric-help-button', '.metric-operation-grid']) {
    assert.ok(styles.includes(marker), `回收店分层排版缺少：${marker}`);
  }
  assert.equal(styles.includes('.income-flow-note'), false, '不应保留独立拉新收益说明样式');
});

test('拉新收益说明通过卡片感叹号打开弹窗', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const store = sourceSection(source, 'function renderStore()', 'function renderGrowth()');
  const helpModal = sourceSection(source, 'function renderLockedIncomeHelpModal()', 'function renderLevelRoadmapModal()');
  for (const marker of ['data-locked-income-help', 'aria-label="查看拉新收益说明"']) {
    assert.ok(store.includes(marker), `拉新收益卡片缺少说明入口：${marker}`);
  }
  for (const marker of ['待解锁拉新收益', '收益形成', '解锁后', '结算后', '转入待结算店铺收益', '进入可提现余额']) {
    assert.ok(helpModal.includes(marker), `拉新收益弹窗缺少：${marker}`);
  }
  assert.ok(source.includes("event.target.closest('[data-locked-income-help]')"), '感叹号没有绑定弹窗事件');
  assert.ok(source.includes('renderLockedIncomeHelpModal();'), '感叹号没有打开说明弹窗');
  assert.ok(styles.includes('.income-flow-steps'), '缺少拉新收益弹窗步骤样式');
});

test('店铺进行中订单统一入口与页面标题命名', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const store = sourceSection(source, 'function renderStore()', 'function renderGrowth()');
  assert.ok(store.includes('店铺进行中订单'));
  assert.ok(source.includes("'team-orders': '店铺进行中订单'"));
  assert.equal(store.includes('团队进行中订单'), false);
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

test('客户与团队隐藏升级贡献并保留概览和脱敏成员行', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of ['team-contribution', '下一级升级贡献', '团队店主是当前最慢指标']) {
    assert.equal(team.includes(marker), false, `客户与团队仍展示升级贡献：${marker}`);
  }
  for (const marker of ['team-overview', 'team-tabs', 'person-row']) {
    assert.ok(team.includes(marker), `客户与团队缺少结构：${marker}`);
  }
  assert.equal(team.includes('person-button'), false, '成员行不应保留整行跳转按钮');
  assert.equal(team.includes('<i>›</i>'), false, '成员行不应展示跳转箭头');
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

test('LV11和LV12隐藏二级店主筛选并保留团队数据列表', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of ['团队数据', "state.teamFilter === '团队数据'", 'person-row']) {
    assert.ok(team.includes(marker), `高等级团队数据缺少：${marker}`);
  }
  assert.equal(team.includes("'二级店主'"), false, '高等级筛选不应展示二级店主');
  assert.ok(team.includes("['全部', '直属店主', '直属客户', '团队数据']"), '高等级筛选项顺序不正确');
  assert.ok(source.includes('const teamDataMembers = ['), '缺少团队成员示例数据');
  assert.ok(!team.includes('team-order-list'), '团队数据不应使用订单列表结构');
  assert.ok(!source.includes('const teamOrderRows = ['), '不应保留团队订单示例数据');
  assert.ok(!styles.includes('.team-order-card'), '不应保留团队订单卡片样式');
});

test('客户与团队仅使用直属店主直属客户和团队客户三种关系名称', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const orderData = sourceSection(source, 'const teamOrders = [', 'const teamDataMembers = [');
  const teamData = sourceSection(source, 'const teamDataMembers = [', 'const trainingContent = {');
  for (const marker of ["kind: '一级团队'", "kind: '二级团队'", "kind: '二级店主'"]) {
    assert.equal(teamData.includes(marker), false, `团队成员仍使用旧关系名称：${marker}`);
  }
  assert.ok(teamData.includes("kind: '团队客户'"), '团队成员缺少“团队客户”关系名称');
  assert.equal(teamData.includes('绑定于2026-06-18'), false, '直属客户不应展示绑定日期');
  assert.equal(teamData.includes('手机号尾号 6815'), false, '直属客户不应展示真实手机尾号');
  assert.equal((teamData.match(/meta: '手机尾号 xxxx'/g) || []).length, 2, '直属客户描述应统一为“手机尾号 xxxx”');
  for (const marker of ['一级团队', '二级团队', '本人经营']) {
    assert.equal(orderData.includes(marker), false, `订单归属仍使用旧客户类型：${marker}`);
  }
  for (const marker of ['直属客户 ·', '直属店主 ·', '团队客户 ·']) {
    assert.ok(orderData.includes(marker), `订单归属缺少客户类型：${marker}`);
  }
});

test('LV11和LV12仅允许将团队客户升级为店主', () => {
  const source = readFileSync(`${root}/app.js`, 'utf8');
  const styles = readFileSync(`${root}/styles.css`, 'utf8');
  const team = sourceSection(source, 'function renderTeam()', 'function renderShare()');
  for (const marker of [
    'state.level >= 11',
    "member.kind === '直属客户'",
    'promote-owner-button',
    '升级为店主',
    '已发起店主升级',
  ]) {
    assert.ok(team.includes(marker), `客户升级店主操作缺少：${marker}`);
  }
  assert.ok(styles.includes('.person-row-actions'), '缺少成员行右侧操作区样式');
  assert.ok(styles.includes('.promote-owner-button'), '缺少升级为店主按钮样式');
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
