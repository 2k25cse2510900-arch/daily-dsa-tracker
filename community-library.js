"use strict";

const crypto = require("node:crypto");

const LIBRARY_CONTENT_TYPES = Object.freeze([
  "concept-note",
  "algorithm-summary",
  "problem-note",
  "problem-approach",
  "complexity-analysis",
  "code-snippet",
  "dry-run-example",
  "interview-prep",
  "revision-sheet",
  "roadmap",
  "custom"
]);

const LIBRARY_TOPICS = Object.freeze([
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks & Queues",
  "Trees & BST",
  "Graphs",
  "Dynamic Programming",
  "Backtracking",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Greedy",
  "Bit Manipulation",
  "Heaps",
  "Tries",
  "Math & Geometry"
]);

const LIBRARY_DIFFICULTIES = Object.freeze([
  "Beginner",
  "Easy",
  "Medium",
  "Hard",
  "Advanced"
]);

const LIBRARY_VISIBILITIES = Object.freeze([
  "private",
  "group",
  "community",
  "public"
]);

function libraryError(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function sanitizeText(str, maxLength = 50000) {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLength);
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t).trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""))
    .filter(t => t.length > 0 && t.length <= 30)
    .slice(0, 10);
}

function createCommunityLibraryService({
  db = null,
  provider = null,
  now = () => new Date()
} = {}) {
  const resourcesCol = db && typeof db.collection === "function" ? db.collection("libraryResources") : null;
  const bookmarksCol = db && typeof db.collection === "function" ? db.collection("libraryBookmarks") : null;
  const collectionsCol = db && typeof db.collection === "function" ? db.collection("libraryCollections") : null;
  const reactionsCol = db && typeof db.collection === "function" ? db.collection("libraryReactions") : null;
  const reportsCol = db && typeof db.collection === "function" ? db.collection("libraryReports") : null;
  const suggestionsCol = db && typeof db.collection === "function" ? db.collection("libraryEditSuggestions") : null;
  const groupMembersCol = db && typeof db.collection === "function" ? db.collection("groupMembers") : null;

  async function checkGroupMembership(userId, groupId) {
    if (!userId || !groupId) return false;
    if (!groupMembersCol) return false;
    const member = await groupMembersCol.findOne({
      groupId,
      userId,
      status: "approved"
    });
    return Boolean(member);
  }

  function canAccessResource(resource, user, isGroupMember = false) {
    if (!resource) return false;
    const userId = user?.id || user?.userId;
    const isAdmin = user?.role === "admin";
    const isAuthor = userId && resource.author?.id === userId;

    if (isAdmin || isAuthor) return true;

    // Drafts are strictly private to author
    if (resource.status === "draft") return false;

    // Hidden by moderation
    if (resource.moderationStatus === "hidden") return false;

    // Visibility checks
    if (resource.visibility === "private") return false;
    if (resource.visibility === "group") {
      return Boolean(isGroupMember);
    }
    if (resource.visibility === "community" || resource.visibility === "public") {
      return true;
    }

    return false;
  }

  // --- Resource CRUD ---

  async function createResource(user, data = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Authentication required to create resources.", 401);

    const title = String(data.title || "").trim();
    if (title.length < 3 || title.length > 120) {
      throw libraryError("INVALID_TITLE", "Title must be between 3 and 120 characters.", 400);
    }

    const description = sanitizeText(data.description || "", 300);
    const contentType = LIBRARY_CONTENT_TYPES.includes(data.contentType) ? data.contentType : "concept-note";
    const topic = LIBRARY_TOPICS.includes(data.topic) ? data.topic : "Arrays";
    const subtopic = sanitizeText(data.subtopic || "", 60);
    const difficulty = LIBRARY_DIFFICULTIES.includes(data.difficulty) ? data.difficulty : "Medium";
    const tags = sanitizeTags(data.tags);
    const content = sanitizeText(data.content || "", 50000);
    const visibility = LIBRARY_VISIBILITIES.includes(data.visibility) ? data.visibility : "community";
    const status = data.status === "draft" ? "draft" : "published";

    let groupId = null;
    let groupName = null;
    if (visibility === "group") {
      groupId = String(data.groupId || "").trim();
      if (!groupId) {
        throw libraryError("GROUP_REQUIRED", "Group association is required for group-scoped visibility.", 400);
      }
      const isMember = await checkGroupMembership(user.id, groupId);
      if (!isMember) {
        throw libraryError("NOT_GROUP_MEMBER", "You must be an approved member of the group to publish to it.", 403);
      }
      groupName = sanitizeText(data.groupName || "Learning Group", 60);
    }

    const resourceId = `lib_${crypto.randomUUID()}`;
    const record = {
      _id: resourceId,
      title,
      description,
      contentType,
      topic,
      subtopic,
      difficulty,
      tags,
      content,
      codeSnippet: {
        code: sanitizeText(data.codeSnippet?.code || "", 15000),
        language: sanitizeText(data.codeSnippet?.language || "python", 20)
      },
      complexity: {
        time: sanitizeText(data.complexity?.time || "", 30),
        space: sanitizeText(data.complexity?.space || "", 30)
      },
      author: {
        id: user.id,
        name: user.name || user.displayName || "DSA Community Member",
        role: user.role || "member"
      },
      visibility,
      groupId,
      groupName,
      status,
      version: 1,
      problemSlug: sanitizeText(data.problemSlug || "", 80),
      problemTitle: sanitizeText(data.problemTitle || "", 120),
      algorithmId: sanitizeText(data.algorithmId || "", 80),
      helpfulCount: 0,
      bookmarkCount: 0,
      moderationStatus: "approved",
      moderationReason: null,
      createdAt: now(),
      updatedAt: now()
    };

    if (resourcesCol) {
      await resourcesCol.insertOne(record);
    }

    return record;
  }

  async function getResource(user, resourceId) {
    if (!resourceId) throw libraryError("RESOURCE_ID_REQUIRED", "Resource ID is required.", 400);
    if (!resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Resource repository is offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Educational resource was not found.", 404);

    const isGroupMember = doc.visibility === "group" && doc.groupId
      ? await checkGroupMembership(user?.id, doc.groupId)
      : false;

    if (!canAccessResource(doc, user, isGroupMember)) {
      throw libraryError("FORBIDDEN", "You do not have permission to view this resource.", 403);
    }

    // Attach user-specific interaction status if authenticated
    let isBookmarked = false;
    let isHelpfulReacted = false;

    if (user?.id) {
      if (bookmarksCol) {
        const bm = await bookmarksCol.findOne({ _id: `bm_${user.id}_${resourceId}` });
        isBookmarked = Boolean(bm);
      }
      if (reactionsCol) {
        const rx = await reactionsCol.findOne({ _id: `rxn_${user.id}_${resourceId}` });
        isHelpfulReacted = Boolean(rx);
      }
    }

    return {
      ...doc,
      isBookmarked,
      isHelpfulReacted,
      isOwner: Boolean(user?.id && doc.author?.id === user.id)
    };
  }

  async function updateResource(user, resourceId, updates = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Authentication required.", 401);
    if (!resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    const isAuthor = doc.author?.id === user.id;
    const isAdmin = user.role === "admin";
    if (!isAuthor && !isAdmin) {
      throw libraryError("FORBIDDEN", "You can only edit resources that you created.", 403);
    }

    const setFields = {
      updatedAt: now()
    };

    if (typeof updates.title === "string") {
      const t = updates.title.trim();
      if (t.length < 3 || t.length > 120) throw libraryError("INVALID_TITLE", "Title must be 3-120 characters.", 400);
      setFields.title = t;
    }
    if (typeof updates.description === "string") setFields.description = sanitizeText(updates.description, 300);
    if (typeof updates.content === "string") setFields.content = sanitizeText(updates.content, 50000);
    if (LIBRARY_CONTENT_TYPES.includes(updates.contentType)) setFields.contentType = updates.contentType;
    if (LIBRARY_TOPICS.includes(updates.topic)) setFields.topic = updates.topic;
    if (typeof updates.subtopic === "string") setFields.subtopic = sanitizeText(updates.subtopic, 60);
    if (LIBRARY_DIFFICULTIES.includes(updates.difficulty)) setFields.difficulty = updates.difficulty;
    if (Array.isArray(updates.tags)) setFields.tags = sanitizeTags(updates.tags);
    if (updates.codeSnippet) {
      setFields.codeSnippet = {
        code: sanitizeText(updates.codeSnippet.code || "", 15000),
        language: sanitizeText(updates.codeSnippet.language || "python", 20)
      };
    }
    if (updates.complexity) {
      setFields.complexity = {
        time: sanitizeText(updates.complexity.time || "", 30),
        space: sanitizeText(updates.complexity.space || "", 30)
      };
    }
    if (LIBRARY_VISIBILITIES.includes(updates.visibility)) {
      if (updates.visibility === "group") {
        const grp = updates.groupId || doc.groupId;
        if (!grp) throw libraryError("GROUP_REQUIRED", "Group ID is required for group visibility.", 400);
        const isMem = await checkGroupMembership(user.id, grp);
        if (!isMem) throw libraryError("NOT_GROUP_MEMBER", "You must belong to the group.", 403);
        setFields.groupId = grp;
        setFields.groupName = sanitizeText(updates.groupName || doc.groupName || "Learning Group", 60);
      }
      setFields.visibility = updates.visibility;
    }
    if (updates.status === "draft" || updates.status === "published" || updates.status === "archived") {
      setFields.status = updates.status;
    }
    if (typeof updates.problemSlug === "string") setFields.problemSlug = sanitizeText(updates.problemSlug, 80);
    if (typeof updates.algorithmId === "string") setFields.algorithmId = sanitizeText(updates.algorithmId, 80);

    setFields.version = (doc.version || 1) + 1;

    await resourcesCol.updateOne({ _id: resourceId }, { $set: setFields });

    return {
      ...doc,
      ...setFields
    };
  }

  async function deleteResource(user, resourceId) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Authentication required.", 401);
    if (!resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    const isAuthor = doc.author?.id === user.id;
    const isAdmin = user.role === "admin";
    if (!isAuthor && !isAdmin) {
      throw libraryError("FORBIDDEN", "You can only delete resources that you created.", 403);
    }

    await resourcesCol.deleteOne({ _id: resourceId });

    // Clean up dependent bookmarks and reactions
    if (bookmarksCol) await bookmarksCol.deleteMany({ resourceId });
    if (reactionsCol) await reactionsCol.deleteMany({ resourceId });
    if (suggestionsCol) await suggestionsCol.deleteMany({ resourceId });

    return { success: true, deletedId: resourceId };
  }

  async function publishResource(user, resourceId) {
    return updateResource(user, resourceId, { status: "published" });
  }

  async function archiveResource(user, resourceId) {
    return updateResource(user, resourceId, { status: "archived" });
  }

  async function listResources(user, options = {}) {
    if (!resourcesCol) return { resources: [], total: 0, page: 1, limit: 20, hasMore: false };

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    const userId = user?.id || user?.userId;
    const isAdmin = user?.role === "admin";

    // 1. Status / Moderation visibility
    if (options.status && options.status === "draft") {
      // Drafts can only be requested by author
      if (!userId) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to view drafts.", 401);
      query.status = "draft";
      query["author.id"] = userId;
    } else if (options.authorId && options.authorId === userId) {
      // Author looking at own contributions: can see own drafts & published
      query["author.id"] = userId;
    } else {
      // General community browse: only published & approved
      query.status = "published";
      if (!isAdmin) {
        query.moderationStatus = { $ne: "hidden" };
      }
    }

    // 2. Visibility scope: private, group, community, public
    if (!isAdmin && query["author.id"] !== userId) {
      const orClauses = [
        { visibility: { $in: ["community", "public"] } }
      ];

      // If user belongs to groups, include group resources for those groups
      if (userId && groupMembersCol) {
        const myApprovedGroups = await groupMembersCol
          .find({ userId, status: "approved" })
          .toArray();
        const myGroupIds = myApprovedGroups.map(g => g.groupId);
        if (myGroupIds.length > 0) {
          orClauses.push({
            visibility: "group",
            groupId: { $in: myGroupIds }
          });
        }
      }

      query.$or = orClauses;
    }

    // 3. Category / Filter options
    if (options.topic && LIBRARY_TOPICS.includes(options.topic)) {
      query.topic = options.topic;
    }
    if (options.difficulty && LIBRARY_DIFFICULTIES.includes(options.difficulty)) {
      query.difficulty = options.difficulty;
    }
    if (options.contentType && LIBRARY_CONTENT_TYPES.includes(options.contentType)) {
      query.contentType = options.contentType;
    }
    if (options.groupId) {
      query.groupId = options.groupId;
    }
    if (options.problemSlug) {
      query.problemSlug = options.problemSlug;
    }

    // 4. Search query (Text / Regex)
    if (options.search && typeof options.search === "string" && options.search.trim()) {
      const s = options.search.trim();
      const regex = new RegExp(s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
      const searchOr = [
        { title: regex },
        { description: regex },
        { topic: regex },
        { subtopic: regex },
        { tags: regex },
        { problemSlug: regex },
        { problemTitle: regex },
        { "author.name": regex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // 5. Sorting
    let sortObj = { createdAt: -1 };
    if (options.sort === "helpful") sortObj = { helpfulCount: -1, createdAt: -1 };
    else if (options.sort === "bookmarks") sortObj = { bookmarkCount: -1, createdAt: -1 };
    else if (options.sort === "updated") sortObj = { updatedAt: -1 };
    else if (options.sort === "oldest") sortObj = { createdAt: 1 };

    const [total, items] = await Promise.all([
      resourcesCol.countDocuments(query),
      resourcesCol.find(query).sort(sortObj).skip(skip).limit(limit).toArray()
    ]);

    // Check user bookmarks if user logged in
    let userBookmarksSet = new Set();
    if (userId && bookmarksCol) {
      const bms = await bookmarksCol.find({ userId }).toArray();
      userBookmarksSet = new Set(bms.map(b => b.resourceId));
    }

    const resources = items.map(doc => ({
      ...doc,
      isBookmarked: userBookmarksSet.has(doc._id),
      isOwner: Boolean(userId && doc.author?.id === userId)
    }));

    return {
      resources,
      total,
      page,
      limit,
      hasMore: skip + items.length < total
    };
  }

  // --- Bookmarks & Collections ---

  async function toggleBookmark(user, resourceId, collectionId = null) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to bookmark.", 401);
    if (!resourceId) throw libraryError("RESOURCE_ID_REQUIRED", "Resource ID is required.", 400);
    if (!bookmarksCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    const bookmarkId = `bm_${user.id}_${resourceId}`;
    const existing = await bookmarksCol.findOne({ _id: bookmarkId });

    if (existing) {
      // Remove bookmark
      await bookmarksCol.deleteOne({ _id: bookmarkId });
      await resourcesCol.updateOne({ _id: resourceId }, { $inc: { bookmarkCount: -1 } });
      const updated = await resourcesCol.findOne({ _id: resourceId });
      return {
        bookmarked: false,
        bookmarkCount: Math.max(0, updated?.bookmarkCount || 0)
      };
    } else {
      // Add bookmark
      await bookmarksCol.insertOne({
        _id: bookmarkId,
        userId: user.id,
        resourceId,
        collectionId: collectionId || null,
        createdAt: now()
      });
      await resourcesCol.updateOne({ _id: resourceId }, { $inc: { bookmarkCount: 1 } });
      const updated = await resourcesCol.findOne({ _id: resourceId });
      return {
        bookmarked: true,
        bookmarkCount: updated?.bookmarkCount || 1
      };
    }
  }

  async function listBookmarks(user, options = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to view bookmarks.", 401);
    if (!bookmarksCol || !resourcesCol) return { bookmarks: [], total: 0 };

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const bmQuery = { userId: user.id };
    if (options.collectionId) {
      bmQuery.collectionId = options.collectionId;
    }

    const [total, userBookmarks] = await Promise.all([
      bookmarksCol.countDocuments(bmQuery),
      bookmarksCol.find(bmQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
    ]);

    const resourceIds = userBookmarks.map(b => b.resourceId);
    const resources = await resourcesCol.find({ _id: { $in: resourceIds } }).toArray();
    const resMap = new Map(resources.map(r => [r._id, r]));

    const bookmarks = userBookmarks
      .map(bm => {
        const resource = resMap.get(bm.resourceId);
        if (!resource) return null;
        return {
          bookmarkId: bm._id,
          savedAt: bm.createdAt,
          collectionId: bm.collectionId,
          resource: {
            ...resource,
            isBookmarked: true,
            isOwner: resource.author?.id === user.id
          }
        };
      })
      .filter(Boolean);

    return {
      bookmarks,
      total,
      page,
      limit,
      hasMore: skip + bookmarks.length < total
    };
  }

  async function createCollection(user, data = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    const name = String(data.name || "").trim();
    if (name.length < 2 || name.length > 50) {
      throw libraryError("INVALID_NAME", "Collection name must be 2-50 characters.", 400);
    }
    if (!collectionsCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const colId = `col_${crypto.randomUUID()}`;
    const col = {
      _id: colId,
      userId: user.id,
      name,
      description: sanitizeText(data.description || "", 150),
      createdAt: now()
    };

    await collectionsCol.insertOne(col);
    return col;
  }

  async function listCollections(user) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!collectionsCol) return [];
    return collectionsCol.find({ userId: user.id }).sort({ createdAt: 1 }).toArray();
  }

  async function deleteCollection(user, collectionId) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!collectionsCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const col = await collectionsCol.findOne({ _id: collectionId, userId: user.id });
    if (!col) throw libraryError("NOT_FOUND", "Collection was not found.", 404);

    await collectionsCol.deleteOne({ _id: collectionId });
    if (bookmarksCol) {
      await bookmarksCol.updateMany({ userId: user.id, collectionId }, { $set: { collectionId: null } });
    }

    return { success: true, deletedId: collectionId };
  }

  // --- Quality Reactions ---

  async function toggleReaction(user, resourceId, type = "helpful") {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to react.", 401);
    if (!resourceId) throw libraryError("RESOURCE_ID_REQUIRED", "Resource ID is required.", 400);
    if (!reactionsCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    // Authors cannot react to their own resources (prevents artificial popularity inflation)
    if (doc.author?.id === user.id) {
      throw libraryError("SELF_REACTION_PROHIBITED", "You cannot mark your own resource as helpful.", 400);
    }

    const reactionId = `rxn_${user.id}_${resourceId}`;
    const existing = await reactionsCol.findOne({ _id: reactionId });

    if (existing) {
      // Remove reaction
      await reactionsCol.deleteOne({ _id: reactionId });
      await resourcesCol.updateOne({ _id: resourceId }, { $inc: { helpfulCount: -1 } });
      const updated = await resourcesCol.findOne({ _id: resourceId });
      return {
        reacted: false,
        helpfulCount: Math.max(0, updated?.helpfulCount || 0)
      };
    } else {
      // Add reaction
      await reactionsCol.insertOne({
        _id: reactionId,
        userId: user.id,
        resourceId,
        type,
        createdAt: now()
      });
      await resourcesCol.updateOne({ _id: resourceId }, { $inc: { helpfulCount: 1 } });
      const updated = await resourcesCol.findOne({ _id: resourceId });
      return {
        reacted: true,
        helpfulCount: updated?.helpfulCount || 1
      };
    }
  }

  // --- Collaboration & Suggested Edits ---

  async function submitSuggestion(user, resourceId, data = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to suggest edits.", 401);
    if (!suggestionsCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    const suggestedTitle = data.suggestedTitle ? String(data.suggestedTitle).trim() : doc.title;
    const suggestedContent = String(data.suggestedContent || "").trim();
    if (!suggestedContent) {
      throw libraryError("CONTENT_REQUIRED", "Suggested content cannot be empty.", 400);
    }

    const explanation = sanitizeText(data.explanation || "", 500);

    const suggestion = {
      _id: `sug_${crypto.randomUUID()}`,
      resourceId,
      resourceTitle: doc.title,
      authorId: doc.author?.id,
      contributorId: user.id,
      contributorName: user.name || user.displayName || "Peer Contributor",
      suggestedTitle,
      suggestedContent,
      explanation,
      status: "pending",
      authorNote: null,
      createdAt: now(),
      resolvedAt: null
    };

    await suggestionsCol.insertOne(suggestion);
    return suggestion;
  }

  async function listSuggestions(user, resourceId = null) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!suggestionsCol) return [];

    const query = {};
    if (resourceId) {
      query.resourceId = resourceId;
      // Must be author or contributor
      query.$or = [{ authorId: user.id }, { contributorId: user.id }];
    } else {
      // All suggestions for resources authored by this user
      query.authorId = user.id;
    }

    return suggestionsCol.find(query).sort({ createdAt: -1 }).toArray();
  }

  async function reviewSuggestion(user, suggestionId, { decision, authorNote = "" } = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    if (!["accepted", "rejected"].includes(decision)) {
      throw libraryError("INVALID_DECISION", "Decision must be 'accepted' or 'rejected'.", 400);
    }
    if (!suggestionsCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const suggestion = await suggestionsCol.findOne({ _id: suggestionId });
    if (!suggestion) throw libraryError("NOT_FOUND", "Suggestion was not found.", 404);

    if (suggestion.authorId !== user.id && user.role !== "admin") {
      throw libraryError("FORBIDDEN", "Only the resource author can accept or reject suggestions.", 403);
    }

    if (suggestion.status !== "pending") {
      throw libraryError("ALREADY_RESOLVED", `Suggestion has already been ${suggestion.status}.`, 400);
    }

    const resolvedAt = now();
    await suggestionsCol.updateOne(
      { _id: suggestionId },
      { $set: { status: decision, authorNote: sanitizeText(authorNote, 300), resolvedAt } }
    );

    if (decision === "accepted") {
      // Safely apply accepted changes to the resource
      await resourcesCol.updateOne(
        { _id: suggestion.resourceId },
        {
          $set: {
            title: suggestion.suggestedTitle,
            content: suggestion.suggestedContent,
            updatedAt: resolvedAt
          },
          $inc: { version: 1 }
        }
      );
    }

    return {
      success: true,
      suggestionId,
      status: decision,
      resolvedAt
    };
  }

  // --- Moderation & Reports ---

  async function submitReport(user, resourceId, data = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required to report.", 401);
    if (!reportsCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const doc = await resourcesCol.findOne({ _id: resourceId });
    if (!doc) throw libraryError("RESOURCE_NOT_FOUND", "Resource was not found.", 404);

    const reason = String(data.reason || "other").toLowerCase();
    const details = sanitizeText(data.details || "", 1000);

    const report = {
      _id: `rep_${crypto.randomUUID()}`,
      resourceId,
      resourceTitle: doc.title,
      authorId: doc.author?.id,
      reporterId: user.id,
      reason,
      details,
      status: "pending",
      resolutionNote: null,
      resolvedBy: null,
      createdAt: now(),
      resolvedAt: null
    };

    await reportsCol.insertOne(report);

    // Flag resource if multiple reports accumulate
    const totalReports = await reportsCol.countDocuments({ resourceId, status: "pending" });
    if (totalReports >= 3) {
      await resourcesCol.updateOne({ _id: resourceId }, { $set: { moderationStatus: "flagged" } });
    }

    return { success: true, reportId: report._id };
  }

  async function listReports(user, filterStatus = null) {
    if (user?.role !== "admin") throw libraryError("FORBIDDEN", "Administrator permission required.", 403);
    if (!reportsCol) return [];

    const query = {};
    if (filterStatus) query.status = filterStatus;
    return reportsCol.find(query).sort({ createdAt: -1 }).toArray();
  }

  async function resolveReport(user, reportId, { decision, resolutionNote = "", hideResource = false } = {}) {
    if (user?.role !== "admin") throw libraryError("FORBIDDEN", "Administrator permission required.", 403);
    if (!["resolved", "rejected"].includes(decision)) {
      throw libraryError("INVALID_DECISION", "Decision must be 'resolved' or 'rejected'.", 400);
    }
    if (!reportsCol || !resourcesCol) throw libraryError("DATABASE_UNAVAILABLE", "Database offline.", 503);

    const report = await reportsCol.findOne({ _id: reportId });
    if (!report) throw libraryError("NOT_FOUND", "Report was not found.", 404);

    const resolvedAt = now();
    await reportsCol.updateOne(
      { _id: reportId },
      {
        $set: {
          status: decision,
          resolutionNote: sanitizeText(resolutionNote, 500),
          resolvedBy: user.id,
          resolvedAt
        }
      }
    );

    if (hideResource) {
      await resourcesCol.updateOne(
        { _id: report.resourceId },
        { $set: { moderationStatus: "hidden", moderationReason: resolutionNote || "Violated community standards." } }
      );
    } else if (decision === "rejected") {
      // Clear flag if report rejected and no other pending reports
      const pendingRemaining = await reportsCol.countDocuments({ resourceId: report.resourceId, status: "pending" });
      if (pendingRemaining === 0) {
        await resourcesCol.updateOne({ _id: report.resourceId }, { $set: { moderationStatus: "approved" } });
      }
    }

    return { success: true, reportId, status: decision, resolvedAt };
  }

  // --- AI-Powered Educational Assistance ---

  async function summarizeResource(user, resourceId) {
    const res = await getResource(user, resourceId);

    if (provider && typeof provider.generate === "function") {
      try {
        const prompt = `
You are an expert DSA educator. Summarize the following DSA educational resource into 3 concise bullet points for quick revision.

Title: ${res.title}
Topic: ${res.topic} (${res.difficulty})
Content:
${res.content.slice(0, 4000)}

Respond in valid JSON only with this schema:
{
  "summary": "1-sentence executive overview",
  "bulletPoints": ["Point 1", "Point 2", "Point 3"],
  "keyTakeaway": "Single takeaway"
}
`;
        const aiRes = await provider.generate({ prompt, temperature: 0.2 });
        if (aiRes && aiRes.text) {
          const cleaned = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return {
            success: true,
            provider: provider.providerName || "Gemini",
            ...parsed
          };
        }
      } catch (_err) {
        // Fall back gracefully
      }
    }

    // Deterministic educational fallback
    return {
      success: true,
      provider: "Deterministic Educational Engine",
      summary: `${res.title} covers essential principles of ${res.topic} at the ${res.difficulty} level.`,
      bulletPoints: [
        `Focuses on ${res.topic} algorithmic logic and constraints.`,
        res.complexity?.time ? `Target Time Complexity: ${res.complexity.time}; Space Complexity: ${res.complexity.space || "O(1)"}.` : "Highlights standard asymptotic complexity trade-offs.",
        "Emphasizes edge-case handling and optimal state tracking."
      ],
      keyTakeaway: `Mastering ${res.topic} builds foundational pattern recognition for high-frequency coding interviews.`
    };
  }

  async function explainConcept(user, resourceId, level = "intermediate") {
    const res = await getResource(user, resourceId);

    if (provider && typeof provider.generate === "function") {
      try {
        const prompt = `
Explain the core DSA concept in this note for a ${level} student. Use an intuitive analogy and highlight where students commonly get stuck.

Title: ${res.title}
Topic: ${res.topic}
Content:
${res.content.slice(0, 3000)}

Return JSON:
{
  "intuition": "Conceptual mental model or analogy",
  "whyItWorks": "Underlying mathematical/structural reason",
  "commonPitfalls": ["Pitfall 1", "Pitfall 2"]
}
`;
        const aiRes = await provider.generate({ prompt, temperature: 0.3 });
        if (aiRes && aiRes.text) {
          const cleaned = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return { success: true, provider: provider.providerName || "Gemini", ...parsed };
        }
      } catch (_err) {}
    }

    return {
      success: true,
      provider: "Deterministic Educational Engine",
      intuition: `Think of ${res.topic} as systematically narrowing your search space or reusing already-computed answers to avoid redundant work.`,
      whyItWorks: "By exploiting ordered invariants or subproblem structure, we transform exponential exploration into polynomial or logarithmic time.",
      commonPitfalls: [
        "Off-by-one errors when adjusting boundary pointers.",
        "Not considering empty inputs or single-element boundary cases."
      ]
    };
  }

  async function generateRevisionPoints(user, resourceId) {
    const res = await getResource(user, resourceId);

    if (provider && typeof provider.generate === "function") {
      try {
        const prompt = `
Generate high-yield revision flashcard points for this DSA topic:
Title: ${res.title}
Topic: ${res.topic}

Return JSON:
{
  "keyObservations": ["Obs 1", "Obs 2"],
  "recurrenceOrFormula": "Formula or invariant",
  "edgeCases": ["Edge 1", "Edge 2"],
  "complexityReminder": "Time and Space notes"
}
`;
        const aiRes = await provider.generate({ prompt, temperature: 0.2 });
        if (aiRes && aiRes.text) {
          const cleaned = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return { success: true, provider: provider.providerName || "Gemini", ...parsed };
        }
      } catch (_err) {}
    }

    return {
      success: true,
      provider: "Deterministic Educational Engine",
      keyObservations: [
        `Preserve the monotonic or sorted invariant when traversing ${res.topic}.`,
        "Check whether auxiliary memory can be compressed to $O(1)$ variables."
      ],
      recurrenceOrFormula: res.complexity?.time ? `T(N) = ${res.complexity.time}` : "T(N) = O(N)",
      edgeCases: [
        "Empty array, null pointers, or all elements identical.",
        "Maximum integer overflow when calculating midpoints or sums."
      ],
      complexityReminder: `Time: ${res.complexity?.time || "O(N)"}, Space: ${res.complexity?.space || "O(1)"}`
    };
  }

  async function improveDraftClarity(user, draftData = {}) {
    if (!user?.id) throw libraryError("AUTHENTICATION_REQUIRED", "Sign in required.", 401);
    const content = String(draftData.content || "").slice(0, 8000);
    const title = String(draftData.title || "").slice(0, 150);

    if (provider && typeof provider.generate === "function") {
      try {
        const prompt = `
You are an expert DSA editor. Review this educational note draft and suggest clarity improvements. DO NOT overwrite the content automatically.

Title: ${title}
Draft:
${content}

Return JSON:
{
  "readabilityScore": "Good | Needs Polish | Excellent",
  "suggestedTitle": "Polished title or null",
  "strengths": ["Strength 1"],
  "suggestions": [
    { "area": "Explanation", "recommendation": "Be more explicit about boundary conditions." },
    { "area": "Code", "recommendation": "Add comments explaining why pointers move." }
  ],
  "improvedSampleSnippet": "Short polished excerpt for inspiration"
}
`;
        const aiRes = await provider.generate({ prompt, temperature: 0.2 });
        if (aiRes && aiRes.text) {
          const cleaned = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return { success: true, provider: provider.providerName || "Gemini", ...parsed };
        }
      } catch (_err) {}
    }

    return {
      success: true,
      provider: "Deterministic Educational Engine",
      readabilityScore: "Good",
      suggestedTitle: title ? `Mastering ${title}` : null,
      strengths: ["Clear topic alignment", "Direct code connection"],
      suggestions: [
        { area: "Intuition", recommendation: "Add a concrete 3-step walkthrough before showing the code." },
        { area: "Edge Cases", recommendation: "Explicitly mention empty input and duplicate element behavior." }
      ],
      improvedSampleSnippet: "Ensure loop invariant is stated before the while loop begins."
    };
  }

  return {
    LIBRARY_CONTENT_TYPES,
    LIBRARY_TOPICS,
    LIBRARY_DIFFICULTIES,
    LIBRARY_VISIBILITIES,
    createResource,
    getResource,
    updateResource,
    deleteResource,
    publishResource,
    archiveResource,
    listResources,
    toggleBookmark,
    listBookmarks,
    createCollection,
    listCollections,
    deleteCollection,
    toggleReaction,
    submitSuggestion,
    listSuggestions,
    reviewSuggestion,
    submitReport,
    listReports,
    resolveReport,
    summarizeResource,
    explainConcept,
    generateRevisionPoints,
    improveDraftClarity
  };
}

module.exports = {
  LIBRARY_CONTENT_TYPES,
  LIBRARY_TOPICS,
  LIBRARY_DIFFICULTIES,
  LIBRARY_VISIBILITIES,
  createCommunityLibraryService
};
