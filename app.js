const data = require('./full.json')
const _ = require('lodash')

Object.keys(data).forEach((key) => {
  console.log(key)
})
// effect and tech id are same
const AgeTech = {
  DarkAge: 104,
  FeudalAge: 101,
  CastleAge: 102,
  ImperialAge: 103
}
const UnitClass = {
  Miscellaneous: 11,
  Terrain: 14,

  PreyAnimal: 9, // 835 Wild Horse
  Flag: 30,
  NoClass: -1,
  Cliff: 34,
}
const UnitType = {
  EyeCandy: 10,
}

const CommandType = {
  AttributeModifierAddition: 4,
  AttributeModifierMultiply: 5
}

const AttributeTypes = {
  HitPoint: 0,
  LineOfSight: 1,
  SearchRadius: 23,
  MovementSpeed: 5,
  TrainTime: 101,
  Armor: 8, // 特殊處理
  Attack: 9 // 特殊處理
}

const AttributeTypes_2 = {
  BasePierce: 3,
  BaseMelee: 4,
  Attack: 9
}

const hidedUnitClass = [
  UnitClass.NoClass,
  UnitClass.Miscellaneous,
  UnitClass.Flag,
  UnitClass.Terrain,
  UnitClass.Cliff
]
const hidedUnitType = [
  UnitType.EyeCandy
]
const buildings = {}
const units = {}
const techs = {}
const graphicsObj = data.Graphics.reduce((a, b) => {
  if (b.ID === -1) return a

  a[b.ID] = {
    AnimationDuration: b.AnimationDuration,
    FramesPerAngle: b.FrameCount
  }

  return a
})
const unitsObj = data.Civs[0].Units.reduce((a, b) => {
  if (b.ID === -1) return a
  a[b.ID] = b

  return a
})
const effectObj = data.Effects.reduce((a, b, index) => {
  a[index] = b

  return a
})
const techObj = data.Techs.reduce((a, b, index) => {
  a[index] = b

  return a
})
const getCost = function (cost) {
  return cost.reduce((a, b) => {
    if (b.Amount > 0) {
      switch (b.Type) {
        case 0: a.Food = b.Amount
          break
        case 1: a.Wood = b.Amount
          break
        case 2: a.Stone = b.Amount
          break
        case 3: a.Gold = b.Amount
      }
    }

    return a
  }, {})
}
const getAge = function (RequiredTechs) {
  for (const val of RequiredTechs) {
    switch (val) {
      case AgeTech.DarkAge: return val
      case AgeTech.FeudalAge: return val
      case AgeTech.CastleAge: return val
      case AgeTech.ImperialAge: return val
      default: return null
    }
  }
}

const getAdvanceType = function (amount, type) {
  return {
    Amount: amount % 256,
    Type: parseInt(amount / 256)
  }
}

const AgeInfo = {
  [AgeTech.DarkAge]: {
    preFix: 'darkAge_',
    preAge: null,
    nextAge: AgeTech.FeudalAge,
    id: AgeTech.DarkAge
  },
  [AgeTech.FeudalAge]: {
    preFix: 'feudalAge_',
    preAge: AgeTech.DarkAge,
    nextAge: AgeTech.CastleAge,
    id: AgeTech.FeudalAge
  },
  [AgeTech.CastleAge]: {
    preFix: 'castleAge_',
    preAge: AgeTech.FeudalAge,
    nextAge: AgeTech.ImperialAge,
    id: AgeTech.CastleAge
  },
  [AgeTech.ImperialAge]: {
    preFix: 'imperialAge_',
    preAge: AgeTech.CastleAge,
    nextAge: null,
    id: AgeTech.ImperialAge
  }
}

const upgradeAgeUnit = function (ageId, units, effects) {
  effects.forEach((effect) => {
    if (effect.Type !== 3) {
      return
    }

    const currentAge = AgeInfo[ageId]

    /**
     * 如果有前一個時代才做，黑暗時代則不動作
     */
    if (currentAge.preAge) {
      const targetUnit = unitsObj[effect.B]
      if (targetUnit.DeadUnitID !== -1) {
        units[effect.A] = _.cloneDeep(targetUnit)
        units[effect.A].ID = effect.A
      }
    }
  })
  console.log(units)
}

const getEffectedData = function (ageId, preUnitData) {
  const units = {}
  const extraData = {
    changeAttrs: []
  }


  let effects = data.Effects[ageId].EffectCommands

  /**
   * 將升級時代會變不一樣的單位先放進去
   */
  upgradeAgeUnit(ageId, units, effects)
  /**
   * 找出科技是一種，不分文明，不用研發時間的效果
   * 結果要是跟查到的時代 ID 相同
   */
  data.Techs.forEach((tech) => {
    if (tech.Civ === -1 && tech.ResearchTime === 0) {
      if (tech.RequiredTechs[0] === ageId && tech.EffectID > 0) {
        effects = effects.concat(effectObj[tech.EffectID].EffectCommands)
      }
    }
  })


  effects.forEach((command) => {
    if (command.A < 0) {
      return
    }
    if (
      command.Type === CommandType.AttributeModifierAddition ||
      command.Type === CommandType.AttributeModifierMultiply
    ) {
      // 屬性改變
      if (
        command.C === AttributeTypes.LineOfSight ||
        command.C === AttributeTypes.SearchRadius ||
        command.C === AttributeTypes.HitPoint ||
        command.C === AttributeTypes.MovementSpeed ||
        command.C === AttributeTypes.TrainTime
      ) {
        extraData.changeAttrs.push({
          Unit: command.A,
          Type: command.C,
          Amount: command.D,
          CommandType: command.Type
        })
      } else if (
        command.C === AttributeTypes.Armor ||
        command.C === AttributeTypes.Attack
      ) {
        extraData.changeAttrs.push({
          Unit: command.A,
          Type: command.C,
          Amount: command.D,
          CommandType: command.Type
          // 若含有 type 則值為 log2(Amount) - 6 餘數為 amount
        })
      }
    }
  })

  const add = (a, b) => {
    return a + b
  }

  const multiply = (a, b) => {
    return a * b
  }

  extraData.changeAttrs.forEach((data) => {
    const id = data.Unit

    if (typeof units[id] === 'undefined') {
      if (preUnitData && typeof preUnitData[id] !== 'undefined') {
        units[id] = _.cloneDeep(preUnitData[id])
      } else {
        units[id] = _.cloneDeep(unitsObj[data.Unit])
      }
    }

    const unit = units[id]
    let method = () => 0

    if (data.CommandType === CommandType.AttributeModifierAddition) {
      method = add
    } else if (data.CommandType === CommandType.AttributeModifierMultiply) {
      method = multiply
    }


    switch (data.Type) {
      case AttributeTypes.HitPoint:
        unit.HitPoints = method(unit.HitPoints, data.Amount)
      break
      case AttributeTypes.LineOfSight:
        unit.LineOfSight = method(unit.LineOfSight, data.Amount)
      break
      case AttributeTypes.SearchRadius:
        unit.SearchRadius = method(unit.SearchRadius, data.Amount)
      break
      case AttributeTypes.MovementSpeed:
        unit.Speed = method(unit.Speed, data.Amount)
      break
      case AttributeTypes.TrainTime:
        unit.Creatable.TrainTime = method(unit.Creatable.TrainTime, data.Amount)
      break
      case AttributeTypes.Armor:
        var { Amount, Type } = getAdvanceType(data.Amount)

        if (Type === AttributeTypes_2.BasePierce) {
          unit.Creatable.DisplayedPierceArmour = method(unit.Creatable.DisplayedPierceArmour, Amount)
        } else if (Type === AttributeTypes_2.BaseMelee) {
          unit.Type50.DisplayedMeleeArmour = method(unit.Type50.DisplayedMeleeArmour, Amount)
        }

        const finda = unit.Type50.Armours.find((armour) => {
          return armour.Class === Type
        })

        if (finda) {
          finda.Amount = method(finda.Amount, Amount)
        }
      break
      case AttributeTypes.Attack:
        var { Amount, Type } = getAdvanceType(data.Amount)
        if (Type === AttributeTypes_2.BaseMelee || Type === AttributeTypes_2.BasePierce) {
          unit.Type50.DisplayedAttack = method(unit.Type50.DisplayedAttack, Amount)
        }

        const findb = unit.Type50.Attacks.find((attack) => {
          return attack.Class === Type
        })

        if (findb) {
          findb.Amount = method(findb.Amount, Amount)
        }
      break
    }
  })

  return units
}

const feudalAgeData = getEffectedData(AgeTech.FeudalAge)
const castleAgeData = getEffectedData(AgeTech.CastleAge, feudalAgeData)
const imperialAgeData = getEffectedData(AgeTech.ImperialAge, castleAgeData)
const unitsArray = data.Civs[0].Units.slice()

Object.keys(feudalAgeData).forEach((key) => {
  const u = feudalAgeData[key]
  u.ID = AgeInfo[AgeTech.FeudalAge].preFix + String(u.ID)
  unitsArray.push(u)
})

Object.keys(castleAgeData).forEach((key) => {
  const u = castleAgeData[key]
  u.ID = AgeInfo[AgeTech.CastleAge].preFix + String(u.ID)
  unitsArray.push(u)
})

Object.keys(imperialAgeData).forEach((key) => {
  const u = imperialAgeData[key]
  u.ID = AgeInfo[AgeTech.ImperialAge].preFix + String(u.ID)
  unitsArray.push(u)
})

unitsArray.forEach((Unit) => {
  if (hidedUnitClass.includes(Unit.Class) || hidedUnitType.includes(Unit.Type)) {
    return
  }
  let AttackDelaySeconds = 0
  const projectile = unitsObj[Unit.Type50.ProjectileUnitID]

  if (Unit.Type50.FrameDelay !== 0 ||  Unit.Type50.AttackGraphic !== -1) {
    const graphic = graphicsObj[Unit.Type50.AttackGraphic]
    AttackDelaySeconds = graphic.AnimationDuration * (Unit.Type50.FrameDelay / graphic.FramesPerAngle)
  }
  // delete Unit.Building.SnowGraphicID
  // delete Unit.DamageGraphics
  // delete Unit.StandingGraphic
  // delete Unit.DyingGraphic
  let melee = null
  let pierce = null

  Unit.Type50.Attacks.forEach((attack) => {
    if (attack.Class === 3) {
      pierce = attack.Amount
    } else if (attack.Class === 4) {
      melee = attack.Amount
    }
  })

  if (Unit.Type === 80) {
    buildings[Unit.ID] = {
      AccuracyPercent: Unit.Type50.AccuracyPercent,
      Armours: Unit.Type50.Armours,
      Attack: Unit.Type50.DisplayedAttack,
      AttackMelee: melee,
      AttackPierce: pierce,
      AttackDelaySeconds,
      Attacks: Unit.Type50.Attacks,
      Cost: getCost(Unit.Creatable.ResourceCosts),
      Class: Unit.Class,
      Size: { //
        X: Unit.ClearanceSize[0] * 2,
        Y: Unit.ClearanceSize[1] * 2
      },
      FrameDelay: Unit.Type50.FrameDelay,
      GarrisonCapacity: Unit.GarrisonCapacity,
      HP: Unit.HitPoints,
      ID: Unit.ID,
      LanguageHelpId: Unit.LanguageDLLName + 21_000,
      LanguageNameId: Unit.LanguageDLLName,
      LineOfSight: Unit.LineOfSight,
      MeleeArmor: Unit.Type50.DisplayedMeleeArmour,
      MinRange: Unit.Type50.MinRange,
      PierceArmor: Unit.Creatable.DisplayedPierceArmour,
      Range: Unit.Type50.DisplayedRange,
      ProjectileSpeed: projectile ? projectile.Speed : null,
      ReloadTime: Unit.Type50.ReloadTime,
      TrainTime: Unit.Creatable.TrainTime,
      TrainLocationID: Unit.Creatable.TrainLocationID,
      internal_name: Unit.Name
    }
  } else {
    units[Unit.ID] = {
      AccuracyPercent: Unit.Type50.AccuracyPercent,
      Armours: Unit.Type50.Armours,
      Attack: Unit.Type50.DisplayedAttack,
      AttackDelaySeconds,
      Attacks: Unit.Type50.Attacks,
      AttackMelee: melee,
      AttackPierce: pierce,
      Cost: getCost(Unit.Creatable.ResourceCosts),
      Class: Unit.Class,
      FrameDelay: Unit.Type50.FrameDelay,
      AttackGraphic: Unit.Type50.AttackGraphic,
      GarrisonCapacity: Unit.GarrisonCapacity,
      HP: Unit.HitPoints,
      ID: Unit.ID,
      LanguageHelpId: Unit.LanguageDLLName + 21_000,
      LanguageNameId: Unit.LanguageDLLName,
      LineOfSight: Unit.LineOfSight,
      MinRange: Unit.Type50.MinRange,
      MeleeArmor: Unit.Type50.DisplayedMeleeArmour,
      PierceArmor: Unit.Creatable.DisplayedPierceArmour,
      Range: Unit.Type50.DisplayedRange,
      ProjectileSpeed: projectile ? projectile.Speed : null,
      ReloadTime: Unit.Type50.ReloadTime,
      Speed: Unit.Speed, //
      TrainTime: Unit.Creatable.TrainTime,
      TrainLocationID: Unit.Creatable.TrainLocationID,
      internal_name: Unit.Name
    }
  }
})

data.Techs.forEach((Tech, index) => {
  if (Tech.ResearchTime <= 0) {
    return
  }
  const Age = getAge(Tech.RequiredTechs)
  const RequiredTechs = Tech.RequiredTechs.filter((val) => val !== Age && val > 0)

  techs[index] = {
    internal_name: Tech.Name,
    ResearchTime: Tech.ResearchTime,
    ResearchLocation: Tech.ResearchLocation,
    Age,
    RequiredTechs,
    ID: index,
    Cost: getCost(Tech.ResourceCosts),
    LanguageHelpId: Tech.LanguageDLLName + 21_000,
    LanguageNameId: Tech.LanguageDLLName,
  }
})

const json_beautifier = require('csvjson-json_beautifier')
const object = {
  buildings,
  units,
  techs
}
const json = json_beautifier(object, {dropQuotesOnNumbers: false, inlineShortArrays: true})
const fs = require('fs')
fs.writeFile('output.json', json, () => {
  console.log('success')
})
