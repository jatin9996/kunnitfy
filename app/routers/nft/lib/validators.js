const validators = {};
const EthJSUtil = require('ethereumjs-util');

validators.isValidObjectID = function (sObjectID) {
    return sObjectID.length == 24;
}

validators.isValidString = function (sString) {
    return sString.trim().length > 0 && sString.trim().length <= 100;
}

validators.isValidTransactionHash = (sTransactionHash) => {
    const reTransactionHash = /^(0x)?([A-Fa-f0-9]{64})$/;
    return reTransactionHash.test(sTransactionHash);
}

validators.isValidSellingType = (sSellingType) => {
    const aSellingTypes = ['Auction', 'Fixed Sale', 'Unlockable'];
    return aSellingTypes.includes(sSellingType);
}


validators.isValidSignature = function (oSigData) {
    try {
        const msgH = `\x19Ethereum Signed Message:\n${oSigData.sMessage.length}${oSigData.sMessage}`; // adding prefix

        var addrHex = oSigData.sWalletAddress;
        addrHex = addrHex.replace("0x", "").toLowerCase();

        var msgSha = EthJSUtil.keccak256(Buffer.from(msgH));
        var sigDecoded = EthJSUtil.fromRpcSig(oSigData.sSignature);
        var recoveredPub = EthJSUtil.ecrecover(msgSha, sigDecoded.v, sigDecoded.r, sigDecoded.s);
        var recoveredAddress = EthJSUtil.pubToAddress(recoveredPub).toString("hex");

        return (addrHex === recoveredAddress);
    } catch (e) {
        return false;
    }
}

module.exports = validators;