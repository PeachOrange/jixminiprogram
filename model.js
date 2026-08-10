(function (root) {
  const identityNames = [
    { min: 12, name: '超级合伙人' },
    { min: 9, name: '超级店主' },
    { min: 6, name: '星享店主' },
    { min: 3, name: '轻享店主' },
    { min: 2, name: '成长店主' },
  ];

  const statusImpacts = {
    正常: { keepHistoryIncome: true, canUpgrade: true, canAddOwner: true, canEarnNewIncome: true },
    预警: { keepHistoryIncome: true, canUpgrade: true, canAddOwner: true, canEarnNewIncome: true },
    休眠: { keepHistoryIncome: true, canUpgrade: false, canAddOwner: false, canEarnNewIncome: true },
    限权: { keepHistoryIncome: true, canUpgrade: false, canAddOwner: false, canEarnNewIncome: true },
    冻结: { keepHistoryIncome: true, canUpgrade: false, canAddOwner: false, canEarnNewIncome: false },
    终止: { keepHistoryIncome: true, canUpgrade: false, canAddOwner: false, canEarnNewIncome: false },
    已退出: { keepHistoryIncome: true, canUpgrade: false, canAddOwner: false, canEarnNewIncome: false },
  };

  const levelBenefits = {
    2: ['基础业务收益', '统一钱包提现', '新店主学习内容'],
    3: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材'],
    4: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板'],
    5: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材'],
    6: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容'],
    7: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持'],
    8: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持', '专属运营群'],
    9: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持', '专属运营群', '超级店主收益方案'],
    10: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持', '专属运营群', '超级店主收益方案', '区域活动支持'],
    11: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持', '专属运营群', '超级店主收益方案', '区域活动支持', '二级团队经营汇总'],
    12: ['基础业务收益', '统一钱包提现', '新店主学习内容', '发圈基础素材', '一级团队经营看板', '手机回收品类', '店铺专属素材', '团队收益', '高阶鉴定内容', '优先结算支持', '专属运营群', '超级店主收益方案', '区域活动支持', '二级团队经营汇总', '合伙人专属方案', '专属顾问支持'],
  };

  const levelUpgradeRules = {
    2: { targets: [3, 0, 0], relation: 'all', upgradeMode: 'automatic' },
    3: { targets: [5, 2000, 6], relation: 'all', upgradeMode: 'automatic' },
    4: { targets: [12, 5000, 12], relation: 'all', upgradeMode: 'automatic' },
    5: { targets: [20, 10000, 20], relation: 'all', upgradeMode: 'automatic' },
    6: { targets: [30, 18000, 35], relation: 'all', upgradeMode: 'automatic' },
    7: { targets: [40, 28000, 55], relation: 'all', upgradeMode: 'automatic' },
    8: { targets: [50, 40000, 80], relation: 'all', upgradeMode: 'automatic' },
    9: { targets: [65, 65000, 120], relation: 'all', upgradeMode: 'automatic' },
    10: { targets: [90, 100000, 180], relation: 'all', upgradeMode: 'automatic' },
    11: { targets: [120, 160000, 260], relation: 'all', upgradeMode: 'automatic' },
    12: { targets: [0, 0, 0], relation: 'offline', upgradeMode: 'contact' },
  };

  const benefitUsageDescriptions = {
    基础业务收益: '有效业务订单完成结算后，收益自动计入统一钱包。',
    统一钱包提现: '在“我的钱包”查看可提现余额并提交提现申请。',
    新店主学习内容: '进入“专属素材”的学习资料查看已解锁内容。',
    发圈基础素材: '进入“专属素材”的发圈工具复制文案或保存配图。',
    一级团队经营看板: '在“客户与团队”查看直属客户与一级团队数据。',
    手机回收品类: '在我的回收店查看手机品类并发起对应回收业务。',
    店铺专属素材: '在“专属素材”使用当前等级开放的店铺内容。',
    团队收益: '符合规则的团队订单结算后，在收益明细中查看。',
    高阶鉴定内容: '进入学习资料查看当前等级开放的鉴定课程。',
    优先结算支持: '符合规则的订单会按当前权益方案进入优先结算流程。',
    专属运营群: '联系专属运营顾问完成运营群身份核验与加入。',
    超级店主收益方案: '新订单按当前生效的超级店主收益方案计算。',
    区域活动支持: '通过专属运营顾问申请符合条件的区域活动支持。',
    二级团队经营汇总: '在“客户与团队”查看二级团队的脱敏汇总数据。',
    合伙人专属方案: '联系专属顾问确认方案范围与生效条件。',
    专属顾问支持: '在我的回收店进入专属运营服务并联系顾问。',
  };

  const contentFallbacks = {
    empty: { title: '暂无可用内容', description: '当前分类暂时没有可展示的素材。', action: 'store', actionLabel: '返回我的回收店' },
    'load-error': { title: '内容加载失败', description: '内容暂时无法加载，请稍后重试。', action: 'retry', actionLabel: '重新加载' },
    'network-error': { title: '网络连接异常', description: '请检查网络连接后重新尝试。', action: 'retry', actionLabel: '重新连接' },
    unavailable: { title: '内容已下架', description: '该内容暂不可查看，请返回素材列表选择其他内容。', action: 'training', actionLabel: '返回素材列表' },
  };

  function getIdentityView(state) {
    if (state.role !== 'owner') return { identity: '普通用户', level: 1, showStoreArea: false };
    const level = Math.max(2, Math.min(12, Number(state.level) || 2));
    const identity = identityNames.find((item) => level >= item.min)?.name || '成长店主';
    return { identity, level, showStoreArea: true };
  }

  function calculateProgress(conditions, relation) {
    const enabled = conditions.filter((item) => item.enabled !== false && Number(item.target) > 0);
    if (!enabled.length) return 0;
    const values = enabled.map((item) => Math.min(100, Math.round((Number(item.current) / Number(item.target)) * 100)));
    return relation === 'any' ? Math.max(...values) : Math.min(...values);
  }

  function getWalletSummary() {
    return {
      withdrawable: 2495.19,
      monthStoreIncome: 960,
      pendingBusiness: 540,
      lockedAcquisition: 120,
      categories: ['回收收入', '自营业务收益', '直属客户收益', '团队收益', '拉新收益'],
    };
  }

  function filterIncome(rows, type) {
    return type === '全部' ? rows.slice() : rows.filter((row) => row.type === type);
  }

  function getLevelCards(currentLevel) {
    const level = Math.max(2, Math.min(12, Number(currentLevel) || 2));
    return [level, Math.min(12, level + 1), Math.min(12, level + 2)]
      .filter((item, index, values) => values.indexOf(item) === index)
      .map((item) => {
        const previous = levelBenefits[item - 1] || [];
        return {
          level: item,
          identity: getIdentityView({ role: 'owner', level: item }).identity,
          benefits: (levelBenefits[item] || []).map((name) => ({ name, isNew: item > level && !previous.includes(name) })),
        };
      });
  }

  function getLevelRoadmap(currentLevel) {
    const level = Math.max(2, Math.min(12, Number(currentLevel) || 2));
    const roadmap = [];
    for (let targetLevel = level + 3; targetLevel <= 12; targetLevel += 1) {
      const previous = levelBenefits[targetLevel - 1] || [];
      roadmap.push({
        level: targetLevel,
        identity: getIdentityView({ role: 'owner', level: targetLevel }).identity,
        newBenefits: (levelBenefits[targetLevel] || []).filter((name) => !previous.includes(name)),
      });
    }
    return roadmap;
  }

  function getBenefitUsage(level) {
    const normalized = Math.max(2, Math.min(12, Number(level) || 2));
    return (levelBenefits[normalized] || []).map((name) => ({
      name,
      description: benefitUsageDescriptions[name] || '在我的回收店查看该权益的使用入口与生效规则。',
    }));
  }

  function getUpgradeConditions(level) {
    const normalized = Math.max(2, Math.min(12, Number(level) || 2));
    const rule = levelUpgradeRules[normalized];
    const conditionNames = ['店铺客户', '店铺收益', '团队店主'];
    return {
      level: normalized,
      relation: rule.relation,
      upgradeMode: rule.upgradeMode,
      conditions: conditionNames.map((name, index) => ({
        name,
        target: rule.targets[index],
        unit: index === 1 ? '元' : '人',
        money: index === 1,
      })).filter((item) => item.target > 0),
    };
  }

  function summarizeOrders(rows) {
    const summary = { total: 0, 待取件: 0, 待收货: 0, 待质检: 0, 待确认: 0 };
    rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(summary, row.status)) {
        summary[row.status] += 1;
        summary.total += 1;
      }
    });
    return summary;
  }

  function getTeamVisibility(level) {
    return Number(level) >= 11
      ? { depth: 2, canViewSecondLevelDetails: true }
      : { depth: 1, canViewSecondLevelDetails: false };
  }

  function getShareDestination(status) {
    const unavailable = ['冻结', '终止', '已退出'].includes(status);
    return unavailable
      ? { mode: 'platform', allowAttribution: false, message: '当前链接已转为平台通用回收服务' }
      : { mode: 'store', allowAttribution: true, message: '通过店铺专属链接进入' };
  }

  function filterTeamMembers(members, kind) {
    return kind === '全部' ? members.slice() : members.filter((member) => member.kind === kind);
  }

  function getStatusImpact(status) {
    return { ...(statusImpacts[status] || statusImpacts.正常) };
  }

  function getUpgradeFeedback(currentLevel) {
    const level = Math.max(2, Math.min(12, Number(currentLevel) || 2));
    const targetLevel = level >= 11 ? 12 : level + 1;
    const previous = levelBenefits[targetLevel - 1] || [];
    const newBenefits = (levelBenefits[targetLevel] || []).filter((name) => !previous.includes(name));
    if (targetLevel === 12) {
      return { type: 'contact', targetLevel, identity: '超级合伙人', autoUpgrade: false, newBenefits };
    }
    return {
      type: 'automatic',
      targetLevel,
      identity: getIdentityView({ role: 'owner', level: targetLevel }).identity,
      autoUpgrade: true,
      newBenefits,
    };
  }

  function getContentFallback(kind) {
    return contentFallbacks[kind] ? { ...contentFallbacks[kind] } : null;
  }

  function upsertRegistration(existing, input) {
    const record = {
      ...(existing || {}),
      realName: String(input.realName || '').trim(),
      phone: String(input.phone || '').trim(),
      wechat: String(input.wechat || '').trim(),
      city: String(input.city || '').trim(),
      storeName: String(input.storeName || '').trim(),
    };
    return { record, updated: Boolean(existing) };
  }

  root.MiniProgramModel = {
    calculateProgress,
    filterIncome,
    filterTeamMembers,
    getBenefitUsage,
    getContentFallback,
    getIdentityView,
    getLevelCards,
    getLevelRoadmap,
    getShareDestination,
    getStatusImpact,
    getTeamVisibility,
    getUpgradeConditions,
    getUpgradeFeedback,
    getWalletSummary,
    summarizeOrders,
    upsertRegistration,
  };
})(globalThis);
